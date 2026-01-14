import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface TimeOffBonusFieldsProps {
  isBonusTimeOff: boolean;
  bonusReason: string;
  onBonusChange: (checked: boolean) => void;
  onReasonChange: (reason: string) => void;
}

const BONUS_REASONS = [
  { value: "TRE/TSE", label: "TRE/TSE" },
  { value: "Abonado pela Chefia", label: "Abonado pela Chefia" },
  { value: "Troca de feriado", label: "Troca de feriado" },
  { value: "Atestado", label: "Atestado" },
  { value: "Licença Médica", label: "Licença Médica" },
];

export default function TimeOffBonusFields({
  isBonusTimeOff,
  bonusReason,
  onBonusChange,
  onReasonChange,
}: TimeOffBonusFieldsProps) {
  return (
    <>
      <div className="flex items-center space-x-2 pt-4">
        <Checkbox
          id="is_bonus_time_off"
          checked={isBonusTimeOff}
          onCheckedChange={(checked) => onBonusChange(checked as boolean)}
        />
        <Label htmlFor="is_bonus_time_off" className="cursor-pointer">
          Folga Abonada?
        </Label>
      </div>

      {isBonusTimeOff && (
        <div>
          <Label htmlFor="bonus_reason">Motivo do Abono *</Label>
          <Select value={bonusReason} onValueChange={onReasonChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o motivo..." />
            </SelectTrigger>
            <SelectContent>
              {BONUS_REASONS.map((reason) => (
                <SelectItem key={reason.value} value={reason.value}>
                  {reason.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Info about deduction */}
      <div className="col-span-full">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {isBonusTimeOff
              ? "Será descontado 1 abono do banco de horas do funcionário."
              : "Será descontado 8 horas do banco de horas do funcionário."}
          </AlertDescription>
        </Alert>
      </div>
    </>
  );
}
