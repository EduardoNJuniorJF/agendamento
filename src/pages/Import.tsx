import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Upload } from 'lucide-react';
import Papa from 'papaparse';
import type { Database } from '@/types/database';

type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parsePreview(selectedFile);
    }
  };

  const parsePreview = (file: File) => {
    Papa.parse(file, {
      header: true,
      preview: 5,
      complete: (results) => {
        setPreview(results.data);
      },
    });
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);

    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        const appointments: AppointmentInsert[] = [];

        for (const row of results.data as any[]) {
          // Mapear colunas do CSV para estrutura do banco
          if (row.Data && row.Atendimento) {
            appointments.push({
              title: row.Atendimento || row.Cliente || 'Sem título',
              date: row.Data,
              time: row.Horário || '09:00',
              city: row.Cidade || 'Não especificada',
              description: `Importado do CSV - ${row.Veículo || ''} - ${row.Agente || ''}`,
              status: 'scheduled',
              expense_status: 'não_separar',
            });
          }
        }

        if (appointments.length === 0) {
          toast({
            title: 'Nenhum agendamento válido encontrado',
            description: 'Verifique o formato do arquivo CSV',
            variant: 'destructive',
          });
          setImporting(false);
          return;
        }

        const { error } = await supabase.from('appointments').insert(appointments);

        if (error) {
          toast({
            title: 'Erro ao importar',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Importação concluída!',
            description: `${appointments.length} agendamentos importados com sucesso`,
          });
          setFile(null);
          setPreview([]);
        }

        setImporting(false);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar CSV</h1>
        <p className="text-muted-foreground">Importe seus agendamentos históricos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload de Arquivo</CardTitle>
          <CardDescription>
            Selecione um arquivo CSV com as colunas: Data, Atendimento, Cidade, Horário
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileUp className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <label htmlFor="csv-upload" className="cursor-pointer">
                <div className="text-sm text-muted-foreground">
                  Clique para selecionar ou arraste um arquivo CSV
                </div>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {file && (
                <div className="text-sm font-medium mt-2">
                  Arquivo selecionado: {file.name}
                </div>
              )}
            </div>
          </div>

          {preview.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Prévia (primeiras 5 linhas)</h3>
              <div className="bg-muted p-4 rounded-lg overflow-auto">
                <pre className="text-xs">{JSON.stringify(preview, null, 2)}</pre>
              </div>
            </div>
          )}

          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {importing ? 'Importando...' : 'Importar Agendamentos'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Formato esperado do CSV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg">
            <code className="text-sm">
              Data,Atendimento,Cidade,Horário,Veículo,Agente
              <br />
              2024-01-15,Cliente ABC,São Paulo,09:00,Gol,João Silva
              <br />
              2024-01-16,Empresa XYZ,Campinas,14:30,Saveiro,Maria Santos
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
