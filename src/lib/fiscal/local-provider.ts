import type { Company } from "@prisma/client";
import { onlyDigits } from "@/lib/format";
import { gerarChaveAcesso, UF_IBGE } from "./chave";
import type {
  CancelResult,
  EmitResult,
  FiscalProvider,
  InvoiceFull,
} from "./types";

/** Escapa caracteres reservados de XML */
function x(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function f2(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function nowOffset(): string {
  // 2026-08-30T15:04:05-03:00
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}-03:00`
  );
}

/**
 * Provedor fiscal LOCAL: gera o XML e simula a autorizacao **sem transmitir a
 * SEFAZ / prefeitura**. Serve para desenvolvimento, testes e demonstracao.
 * Para emissao real, troque FISCAL_PROVIDER=plugnotas (ou implemente outro).
 */
export class LocalFiscalProvider implements FiscalProvider {
  readonly name = "local";

  async emitNfe(invoice: InvoiceFull, company: Company): Promise<EmitResult> {
    const err = validar(invoice, company, "NFE");
    if (err) return { status: "REJEITADA", motivoRejeicao: err };

    const uf = UF_IBGE[(company.uf ?? "SP").toUpperCase()] ?? "35";
    const chave = gerarChaveAcesso({
      uf,
      dataEmissao: new Date(),
      cnpj: company.cnpj,
      modelo: "55",
      serie: invoice.serie,
      numero: invoice.numero,
    });

    const det = invoice.items
      .map((it, i) => {
        const vProd = it.valorTotal;
        return `    <det nItem="${i + 1}">
      <prod>
        <cProd>${x(it.codigo)}</cProd>
        <xProd>${x(it.descricao)}</xProd>
        <NCM>${x(onlyDigits(it.ncm ?? "") || "00000000")}</NCM>
        <CFOP>${x(it.cfop)}</CFOP>
        <uCom>${x(it.unidade)}</uCom>
        <qCom>${f2(it.quantidade)}</qCom>
        <vUnCom>${f2(it.valorUnit)}</vUnCom>
        <vProd>${f2(vProd)}</vProd>
        <vDesc>${f2(it.desconto)}</vDesc>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          <ICMSSN102>
            <orig>0</orig>
            <CSOSN>${x(it.cstIcms ?? "102")}</CSOSN>
          </ICMSSN102>
        </ICMS>
      </imposto>
    </det>`;
      })
      .join("\n");

    const dest = invoice.partner
      ? `    <dest>
      ${
        onlyDigits(invoice.partner.cpfCnpj ?? "").length === 14
          ? `<CNPJ>${onlyDigits(invoice.partner.cpfCnpj ?? "")}</CNPJ>`
          : `<CPF>${onlyDigits(invoice.partner.cpfCnpj ?? "")}</CPF>`
      }
      <xNome>${x(invoice.partner.nome)}</xNome>
      <enderDest>
        <xLgr>${x(invoice.partner.logradouro ?? "")}</xLgr>
        <nro>${x(invoice.partner.numero ?? "S/N")}</nro>
        <xBairro>${x(invoice.partner.bairro ?? "")}</xBairro>
        <cMun>${x(invoice.partner.codMunicipio ?? "")}</cMun>
        <xMun>${x(invoice.partner.municipio ?? "")}</xMun>
        <UF>${x(invoice.partner.uf ?? "")}</UF>
        <CEP>${x(onlyDigits(invoice.partner.cep ?? ""))}</CEP>
      </enderDest>
      <indIEDest>${x(invoice.partner.indicadorIe ?? "9")}</indIEDest>
    </dest>`
      : "";

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe versao="4.00" Id="NFe${chave}">
      <ide>
        <cUF>${uf}</cUF>
        <natOp>${x(invoice.naturezaOperacao)}</natOp>
        <mod>55</mod>
        <serie>${invoice.serie}</serie>
        <nNF>${invoice.numero}</nNF>
        <dhEmi>${nowOffset()}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <tpAmb>${company.ambienteFiscal === "PRODUCAO" ? "1" : "2"}</tpAmb>
        <finNFe>1</finNFe>
      </ide>
      <emit>
        <CNPJ>${onlyDigits(company.cnpj)}</CNPJ>
        <xNome>${x(company.razaoSocial)}</xNome>
        <xFant>${x(company.nomeFantasia ?? company.razaoSocial)}</xFant>
        <enderEmit>
          <xLgr>${x(company.logradouro ?? "")}</xLgr>
          <nro>${x(company.numero ?? "S/N")}</nro>
          <xBairro>${x(company.bairro ?? "")}</xBairro>
          <cMun>${x(company.codMunicipio ?? "")}</cMun>
          <xMun>${x(company.municipio ?? "")}</xMun>
          <UF>${x(company.uf ?? "")}</UF>
          <CEP>${x(onlyDigits(company.cep ?? ""))}</CEP>
        </enderEmit>
        <IE>${x(onlyDigits(company.ie ?? ""))}</IE>
        <CRT>${company.crt}</CRT>
      </emit>
${dest}
${det}
      <total>
        <ICMSTot>
          <vProd>${f2(invoice.valorProdutos)}</vProd>
          <vDesc>${f2(invoice.valorDesconto)}</vDesc>
          <vFrete>${f2(invoice.valorFrete)}</vFrete>
          <vICMS>${f2(invoice.valorIcms)}</vICMS>
          <vPIS>${f2(invoice.valorPis)}</vPIS>
          <vCOFINS>${f2(invoice.valorCofins)}</vCOFINS>
          <vNF>${f2(invoice.valorTotal)}</vNF>
        </ICMSTot>
      </total>
      <transp><modFrete>9</modFrete></transp>
    </infNFe>
  </NFe>
  <protNFe versao="4.00">
    <infProt>
      <tpAmb>${company.ambienteFiscal === "PRODUCAO" ? "1" : "2"}</tpAmb>
      <chNFe>${chave}</chNFe>
      <dhRecbto>${nowOffset()}</dhRecbto>
      <nProt>${protocoloSimulado()}</nProt>
      <digVal>LOCAL-SEM-ASSINATURA</digVal>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e (PROVEDOR LOCAL - NAO TRANSMITIDO A SEFAZ)</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;

    return {
      status: "AUTORIZADA",
      chaveAcesso: chave,
      protocolo: protocoloSimulado(),
      xml,
    };
  }

  async emitNfse(invoice: InvoiceFull, company: Company): Promise<EmitResult> {
    const err = validar(invoice, company, "NFSE");
    if (err) return { status: "REJEITADA", motivoRejeicao: err };

    const servicos = invoice.serviceItems
      .map(
        (s) => `        <Servico>
          <Discriminacao>${x(s.descricao)}</Discriminacao>
          <ItemListaServico>${x(s.itemListaServico ?? "")}</ItemListaServico>
          <Quantidade>${f2(s.quantidade)}</Quantidade>
          <ValorUnitario>${f2(s.valorUnit)}</ValorUnitario>
          <ValorServico>${f2(s.valorTotal)}</ValorServico>
          <Aliquota>${f2(s.aliquotaIss)}</Aliquota>
          <ValorIss>${f2(s.valorIss)}</ValorIss>
          <IssRetido>${s.issRetido ? "1" : "2"}</IssRetido>
        </Servico>`,
      )
      .join("\n");

    const chave = `NFSE${String(invoice.numero).padStart(9, "0")}${Date.now()
      .toString()
      .slice(-6)}`;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse xmlns="http://www.abrasf.org.br/nfse.xsd">
  <Nfse>
    <InfNfse>
      <Numero>${invoice.numero}</Numero>
      <CodigoVerificacao>${chave}</CodigoVerificacao>
      <DataEmissao>${nowOffset()}</DataEmissao>
      <NaturezaOperacao>1</NaturezaOperacao>
      <PrestadorServico>
        <IdentificacaoPrestador>
          <Cnpj>${onlyDigits(company.cnpj)}</Cnpj>
          <InscricaoMunicipal>${x(onlyDigits(company.im ?? ""))}</InscricaoMunicipal>
        </IdentificacaoPrestador>
        <RazaoSocial>${x(company.razaoSocial)}</RazaoSocial>
      </PrestadorServico>
      <TomadorServico>
        <IdentificacaoTomador>
          <CpfCnpj>${x(onlyDigits(invoice.partner?.cpfCnpj ?? ""))}</CpfCnpj>
        </IdentificacaoTomador>
        <RazaoSocial>${x(invoice.partner?.nome ?? "Consumidor")}</RazaoSocial>
      </TomadorServico>
      <ListaServicos>
${servicos}
      </ListaServicos>
      <ValoresNfse>
        <BaseCalculo>${f2(invoice.valorServicos)}</BaseCalculo>
        <ValorIss>${f2(invoice.valorIss)}</ValorIss>
        <ValorLiquidoNfse>${f2(invoice.valorTotal)}</ValorLiquidoNfse>
      </ValoresNfse>
      <OutrasInformacoes>PROVEDOR LOCAL - NAO TRANSMITIDO A PREFEITURA</OutrasInformacoes>
    </InfNfse>
  </Nfse>
</CompNfse>`;

    return {
      status: "AUTORIZADA",
      chaveAcesso: chave,
      protocolo: protocoloSimulado(),
      xml,
    };
  }

  async cancel(): Promise<CancelResult> {
    return { status: "CANCELADA", protocolo: protocoloSimulado() };
  }
}

function protocoloSimulado(): string {
  return "135" + Date.now().toString().slice(-12);
}

function validar(
  invoice: InvoiceFull,
  company: Company,
  tipo: "NFE" | "NFSE",
): string | null {
  if (!onlyDigits(company.cnpj)) return "CNPJ da empresa nao configurado (Configuracoes).";
  if (!company.uf || !company.municipio)
    return "Endereco da empresa incompleto (Configuracoes).";
  if (tipo === "NFE" && invoice.items.length === 0)
    return "Nota sem itens de produto.";
  if (tipo === "NFSE" && invoice.serviceItems.length === 0)
    return "Nota sem itens de servico.";
  if (tipo === "NFSE" && !onlyDigits(company.im ?? ""))
    return "Inscricao Municipal nao configurada (necessaria para NFS-e).";
  return null;
}
