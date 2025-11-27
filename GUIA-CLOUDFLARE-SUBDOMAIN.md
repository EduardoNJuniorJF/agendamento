# Guia Completo: Configurar Subdomínio no Cloudflare sem Afetar Site na Hostgator

## 🎯 Objetivo Final

- ✅ **zaal.com.br** continua funcionando na Hostgator (INALTERADO)
- ✅ **agendamento.zaal.com.br** funciona no Lovable via Cloudflare (NOVO)
- ✅ Outros subdomínios da Hostgator continuam funcionando (INALTERADOS)

---

## 📋 O Que Você Vai Precisar

1. Acesso ao **Registro.br** (onde está registrado zaal.com.br)
2. Acesso ao **painel da Hostgator** (cPanel)
3. Criar uma conta no **Cloudflare** (gratuito)
4. 30-60 minutos do seu tempo
5. Paciência para aguardar propagação DNS (2-48 horas)

---

## 🔍 Entendendo os Conceitos (Simplificado)

**Analogia simples:**
- **Domínio (zaal.com.br)** = Endereço da sua casa
- **DNS** = Lista telefônica que diz onde fica sua casa
- **Registro.br** = Cartório onde está registrado seu endereço
- **Cloudflare** = Nova lista telefônica (melhor e mais rápida)
- **Subdomínio (agendamento.zaal.com.br)** = Anexo da sua casa

**O que vamos fazer:**
Vamos colocar o Cloudflare como a "lista telefônica principal", mas ele vai continuar apontando tudo para a Hostgator (seu site não para). Só o anexo novo (agendamento) vai para outro lugar (Lovable).

---

## 📝 PASSO 1: Descobrir o IP da Hostgator

### Por que fazer isso?
Precisamos saber o "endereço exato" do seu servidor na Hostgator para que o Cloudflare continue enviando visitantes para lá.

### Como fazer:

1. **Entre no cPanel da Hostgator**
   - Acesse o link que a Hostgator te enviou por email
   - Ou vá em: `https://seu-usuario.hostgatorsite.com:2083`
   - Faça login com seu usuário e senha

2. **Encontre o IP do servidor**
   - No lado direito da tela, procure uma seção chamada **"Estatísticas"** ou **"Server Information"**
   - Você vai ver algo como: **"Endereço IP compartilhado"** ou **"Shared IP Address"**
   - Anote esse número (exemplo: `192.168.1.100`)
   
3. **Método alternativo (se não encontrar no cPanel):**
   - Abra o site: https://www.whatismyip.com/hostname-ip-lookup/
   - Digite: `zaal.com.br`
   - Anote o IP que aparecer

✅ **Anote esse IP em um papel ou bloco de notas!**  
Exemplo: `192.168.1.100` (o seu será diferente)

---

## 📝 PASSO 2: Anotar DNS Atuais do Registro.br

### Por que fazer isso?
Criar uma "cópia de segurança" das configurações atuais, caso precise desfazer algo.

### Como fazer:

1. **Acesse o Registro.br**
   - Vá em: https://registro.br
   - Clique em **"Acesso ao Painel"**
   - Faça login com seu CPF e senha

2. **Encontre seu domínio**
   - Na lista de domínios, clique em **zaal.com.br**

3. **Veja os servidores DNS**
   - Procure por **"Servidores DNS"** ou **"DNS"**
   - Você vai ver algo como:
     ```
     ns1.hostgator.com
     ns2.hostgator.com
     ```
   
4. **Tire um print ou anote esses servidores**
   - Esta é sua configuração atual
   - Você vai precisar disso se der problema

✅ **Salve essas informações!**

---

## 📝 PASSO 3: Criar Conta no Cloudflare

### Como fazer:

1. **Acesse o Cloudflare**
   - Vá em: https://cloudflare.com
   - Clique em **"Sign Up"** (Cadastrar)

2. **Preencha seus dados**
   - Email: seu email
   - Senha: crie uma senha forte
   - Clique em **"Create Account"**

3. **Confirme seu email**
   - Abra o email que o Cloudflare enviou
   - Clique no link de confirmação

✅ **Conta criada!**

---

## 📝 PASSO 4: Adicionar Domínio no Cloudflare

### Como fazer:

1. **No painel do Cloudflare**
   - Clique em **"Add a Site"** (Adicionar um site)
   
2. **Digite seu domínio**
   - Digite: `zaal.com.br` (sem www, sem http, só o domínio)
   - Clique em **"Add Site"**

3. **Escolha o plano FREE**
   - Vai aparecer uma tela com planos
   - Role para baixo e clique em **"Free $0"**
   - Clique em **"Continue"**

4. **Aguarde a varredura DNS**
   - O Cloudflare vai procurar todas as suas configurações atuais
   - Isso leva 30-60 segundos
   - Uma tela com todos os registros DNS vai aparecer

✅ **Domínio adicionado!**

---

## 📝 PASSO 5: Revisar e Ajustar Registros DNS no Cloudflare

### Por que fazer isso?
Garantir que TUDO que funciona na Hostgator continue funcionando.

### Como fazer:

1. **Você verá uma lista de registros**
   - O Cloudflare importou os registros atuais automaticamente
   - Você vai ver linhas com:
     - **Type** (Tipo): A, CNAME, MX, TXT...
     - **Name** (Nome): @, www, mail...
     - **Content** (Conteúdo): IP ou domínio
     - **Proxy status** (Status): 🧡 (laranja) ou ☁️ (cinza)

2. **Verifique os registros principais:**

   **a) Registro do domínio principal (@):**
   ```
   Type: A
   Name: @
   Content: [IP_DA_HOSTGATOR que você anotou]
   Proxy: 🧡 (DNS only - clique para mudar se estiver laranja)
   ```
   
   **b) Registro do www:**
   ```
   Type: A (ou CNAME)
   Name: www
   Content: [IP_DA_HOSTGATOR ou zaal.com.br]
   Proxy: ☁️ (DNS only)
   ```

3. **IMPORTANTE: Desativar proxy (mudar para DNS only)**
   - Clique no ícone de nuvem laranja 🧡
   - Ele deve ficar cinza ☁️ e mostrar **"DNS only"**
   - Faça isso para **TODOS** os registros (exceto o novo que vamos criar)

4. **Verifique registros de EMAIL (MX)**
   - Se você usa email @zaal.com.br, DEVE ter registros MX
   - **NÃO EXCLUA** registros MX, TXT, ou SPF
   - Apenas deixe-os como **"DNS only"** (nuvem cinza)

5. **Clique em "Continue" (Continuar)**

✅ **Registros revisados!**

---

## 📝 PASSO 6: Obter Nameservers do Cloudflare

### Como fazer:

1. **Na próxima tela, você verá:**
   ```
   Change your nameservers
   ```

2. **O Cloudflare vai mostrar 2 endereços:**
   ```
   amy.ns.cloudflare.com
   phil.ns.cloudflare.com
   ```
   
   *(Os seus serão diferentes, mas seguem esse formato)*

3. **COPIE esses 2 endereços**
   - Anote em um papel ou bloco de notas
   - Você vai precisar deles no próximo passo

4. **NÃO CLIQUE EM "DONE" AINDA**
   - Deixe essa aba aberta
   - Vamos voltar aqui depois

✅ **Nameservers copiados!**

---

## 📝 PASSO 7: Alterar DNS no Registro.br

### ⚠️ ATENÇÃO - Momento Crítico
Este é o passo que faz a "troca da lista telefônica". Seu site pode ficar fora do ar por alguns minutos durante a propagação.

### Como fazer:

1. **Volte ao painel do Registro.br**
   - Se fechou, acesse: https://registro.br
   - Faça login
   - Clique em **zaal.com.br**

2. **Encontre "Alterar Servidores DNS"**
   - Procure por **"DNS"** ou **"Servidores DNS"**
   - Clique em **"Alterar servidores"** ou **"Editar"**

3. **Substitua os DNS da Hostgator pelos do Cloudflare**
   
   **ANTES (Hostgator):**
   ```
   ns1.hostgator.com
   ns2.hostgator.com
   ```
   
   **DEPOIS (Cloudflare - use os que você copiou):**
   ```
   amy.ns.cloudflare.com
   phil.ns.cloudflare.com
   ```

4. **Salve as alterações**
   - Clique em **"Salvar"** ou **"Confirmar"**
   - Pode pedir para confirmar por email ou token

5. **Aguarde confirmação**
   - O Registro.br vai enviar um email confirmando
   - Isso é instantâneo

✅ **DNS alterados no Registro.br!**

---

## 📝 PASSO 8: Confirmar no Cloudflare

### Como fazer:

1. **Volte à aba do Cloudflare**
   - Aquela que você deixou aberta com os nameservers

2. **Clique em "Done, check nameservers"**
   - O Cloudflare vai verificar se você fez a mudança

3. **Aguarde a confirmação**
   - Pode levar de 5 minutos a 48 horas
   - Você receberá um email do Cloudflare quando estiver ativo
   - O status vai mudar de **"Pending"** para **"Active"**

4. **Enquanto espera, você pode:**
   - Fechar o navegador e voltar depois
   - Verificar periodicamente em: https://dash.cloudflare.com

✅ **Aguardando ativação!**

---

## 📝 PASSO 9: Criar Registro para Subdomínio no Cloudflare

### ⚠️ IMPORTANTE: Só faça isso DEPOIS que o Cloudflare estiver ACTIVE!

### Como fazer:

1. **Acesse o dashboard do Cloudflare**
   - Vá em: https://dash.cloudflare.com
   - Clique em **zaal.com.br**

2. **Vá em "DNS"**
   - No menu lateral, clique em **"DNS"**
   - Depois clique em **"Records"**

3. **Adicionar novo registro A para o subdomínio**
   - Clique em **"Add Record"** (Adicionar registro)
   
   **Preencha assim:**
   ```
   Type: A
   Name: agendamento
   IPv4 address: 185.158.133.1
   Proxy status: ☁️ DNS only (IMPORTANTE: deixar cinza)
   TTL: Auto
   ```

4. **Clique em "Save"**

✅ **Subdomínio criado no DNS!**

---

## 📝 PASSO 10: Conectar Domínio no Lovable

### Como fazer:

1. **Acesse seu projeto no Lovable**
   - Entre em: https://lovable.dev
   - Abra seu projeto Fleet Manager

2. **Vá em Settings → Domains**
   - Clique no nome do projeto no canto superior esquerdo
   - Clique em **"Settings"**
   - Clique em **"Domains"**

3. **Clique em "Connect Domain"**
   - Digite: `agendamento.zaal.com.br`
   - Clique em **"Connect"**

4. **Copie o código TXT de verificação**
   - O Lovable vai mostrar algo como:
   ```
   Name: _lovable.agendamento
   Value: lovable_verify=ABC123XYZ
   ```
   - Copie esse valor

5. **Volte ao Cloudflare**
   - Vá em DNS → Records
   - Clique em **"Add Record"**
   
   **Preencha assim:**
   ```
   Type: TXT
   Name: _lovable.agendamento
   Content: lovable_verify=ABC123XYZ (o código que você copiou)
   TTL: Auto
   ```
   
   - Clique em **"Save"**

6. **Volte ao Lovable**
   - Clique em **"Verify"** ou **"Check DNS"**
   - Aguarde a verificação (pode levar 5-30 minutos)

✅ **Domínio conectado!**

---

## 📝 PASSO 11: Configurar SSL no Cloudflare

### Por que fazer isso?
Para que seu site tenha HTTPS (cadeado verde) e seja seguro.

### Como fazer:

1. **No Cloudflare, vá em SSL/TLS**
   - No menu lateral, clique em **"SSL/TLS"**

2. **Configure o modo de encriptação**
   - Selecione: **"Full"** ou **"Full (strict)"**
   - **NÃO** deixe em "Flexible"

3. **Ative "Always Use HTTPS"**
   - Vá em **"Edge Certificates"**
   - Ative a opção **"Always Use HTTPS"**

✅ **SSL configurado!**

---

## 📝 PASSO 12: Testar Tudo

### Como testar:

1. **Teste o site principal:**
   - Acesse: `https://zaal.com.br`
   - Acesse: `https://www.zaal.com.br`
   - ✅ Deve abrir normalmente (Hostgator)

2. **Teste outros subdomínios da Hostgator:**
   - Acesse cada subdomínio que você usa
   - ✅ Todos devem funcionar normalmente

3. **Teste o novo subdomínio:**
   - Acesse: `https://agendamento.zaal.com.br`
   - ✅ Deve abrir seu app Lovable

4. **Teste email (se usar email @zaal.com.br):**
   - Envie e receba um email de teste
   - ✅ Email deve funcionar normalmente

---

## ⏱️ Linha do Tempo Esperada

| Tempo | O Que Acontece |
|-------|----------------|
| **0-5 min** | Você altera os nameservers no Registro.br |
| **5-30 min** | Registro.br confirma a alteração |
| **30 min - 2h** | Cloudflare detecta a mudança e fica "Active" |
| **2-24h** | DNS propaga globalmente (seu site já deve estar funcionando) |
| **24-48h** | Propagação completa em todo o mundo |

---

## 🆘 Problemas Comuns e Soluções

### Problema 1: "Site não abre" após mudar DNS

**Solução:**
- Aguarde 2-4 horas para propagação
- Limpe o cache do navegador (Ctrl+F5)
- Teste em modo anônimo
- Teste em outro dispositivo/rede (4G do celular)

### Problema 2: "Subdomínio não funciona"

**Solução:**
- Verifique se o Cloudflare está "Active"
- Verifique se o registro A está correto: `185.158.133.1`
- Verifique se está em "DNS only" (nuvem cinza)
- Aguarde 30-60 minutos

### Problema 3: "Email parou de funcionar"

**Solução:**
- Volte ao Cloudflare → DNS
- Verifique se os registros MX estão presentes
- Verifique se estão em "DNS only" (nuvem cinza)
- Se perdeu, restaure do backup que você anotou

### Problema 4: "Quero voltar tudo como estava"

**Solução:**
1. Volte ao Registro.br
2. Altere os DNS de volta para:
   ```
   ns1.hostgator.com
   ns2.hostgator.com
   ```
3. Aguarde 2-4 horas

---

## 🔒 Checklist de Segurança

Antes de considerar concluído, confira:

- [ ] Site principal (zaal.com.br) abre normalmente
- [ ] www.zaal.com.br redireciona ou abre corretamente  
- [ ] Subdomínios da Hostgator continuam funcionando
- [ ] agendamento.zaal.com.br abre o app Lovable
- [ ] Todos os sites têm cadeado verde (HTTPS)
- [ ] Email funciona (se usar)
- [ ] Você tem o backup dos DNS antigos anotado

---

## 📞 Precisa de Ajuda?

### Ferramentas Úteis:

1. **Verificar propagação DNS:**
   - https://dnschecker.org
   - Digite: `agendamento.zaal.com.br`
   - Veja se o IP `185.158.133.1` aparece

2. **Verificar IP do domínio:**
   - https://www.whatismyip.com/hostname-ip-lookup/
   - Digite seu domínio

3. **Testar SSL:**
   - https://www.ssllabs.com/ssltest/
   - Digite seu domínio

### Suporte:

- **Cloudflare:** https://support.cloudflare.com
- **Lovable:** Chat no app ou https://docs.lovable.dev
- **Registro.br:** https://registro.br/ajuda

---

## ✅ Conclusão

Seguindo este guia:

1. ✅ Seu site principal continua na Hostgator funcionando perfeitamente
2. ✅ O Cloudflare gerencia o DNS (mais rápido e seguro)
3. ✅ O subdomínio agendamento.zaal.com.br aponta para o Lovable
4. ✅ Tudo tem SSL (HTTPS) automático
5. ✅ Você tem backups das configurações antigas

**Tempo total:** 30-60 minutos de trabalho + 2-48h de propagação

**Dificuldade:** Média (mas com este guia fica fácil!)

---

**Última atualização:** 26/11/2025  
**Criado para:** zaal.com.br → agendamento.zaal.com.br
