/**
 * Generates a valid standard PDF/1.4 buffer for rural property documents
 * issued and managed by Meyer Engenharia.
 */
export function generateValidRuralPdf(
  docTitle: string,
  propertyName: string,
  clientName: string,
  docType: string,
  protocol: string,
  issuedDate: string
): Buffer {
  const escapePdf = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacritics for Type1 standard Helvetica font
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  };

  const cleanTitle = escapePdf(docTitle);
  const cleanProperty = escapePdf(propertyName || 'Propriedade Rural');
  const cleanClient = escapePdf(clientName || 'Proprietario');
  const cleanDocType = escapePdf(docType);
  const cleanProtocol = escapePdf(protocol);
  const cleanDate = escapePdf(issuedDate);

  // Content stream instructions (A4 points: 595 x 842)
  const streamLines = [
    // Header decorative bar - Meyer Official Royal Blue (#2E3ED3)
    '0.18 0.24 0.83 rg',
    '36 786 523 24 re',
    'f',
    // Header title
    'BT',
    '/F1 12 Tf',
    '1 1 1 rg',
    '46 793 Td',
    '(MEYER ENGENHARIA - REGULARIZACAO FUNDIARIA E MEIO AMBIENTE) Tj',
    'ET',
    // Document title
    'BT',
    '/F1 15 Tf',
    '0.01 0.02 0.09 rg',
    '36 740 Td',
    `(${cleanTitle}) Tj`,
    'ET',
    // Divider line
    '0.75 0.85 0.78 RG',
    '1 w',
    '36 726 m 559 726 l S',
    // Property and Client information block
    '0.96 0.98 0.96 rg',
    '36 605 523 105 re',
    'f',
    '0.80 0.88 0.82 RG',
    '36 605 523 105 re',
    'S',
    'BT',
    '/F1 11 Tf',
    '0.15 0.25 0.18 rg',
    '48 688 Td',
    '(DADOS DO IMOVEL RURAL E DO PROPRIETARIO) Tj',
    '/F2 10 Tf',
    '0 668 Td',
    `(Imovel Rural: ${cleanProperty}) Tj`,
    '0 650 Td',
    `(Titular / Proprietario: ${cleanClient}) Tj`,
    '0 632 Td',
    `(Servico / Especialidade: ${cleanDocType}) Tj`,
    '0 614 Td',
    `(Protocolo Tecnico Meyer: MYR-${cleanProtocol}) Tj`,
    'ET',
    // Body text section
    'BT',
    '/F1 11 Tf',
    '0.15 0.25 0.18 rg',
    '36 565 Td',
    '(ATESTADO TECNICO DE REGULARIDADE E ARQUIVAMENTO) Tj',
    '/F2 10 Tf',
    '0.25 0.30 0.25 rg',
    '36 540 Td',
    '(O presente documento integra o acervo tecnico de regularizacao rural da Meyer Engenharia,) Tj',
    '36 525 Td',
    '(contendo dados de georreferenciamento, cadastro ambiental ou certidoes oficiais validadas,) Tj',
    '36 510 Td',
    '(pronto para download e apresentacao perante o INCRA, Cartorios e Orgaos Ambientais.) Tj',
    '36 475 Td',
    `(- Data de Conclusao e Disponibilizacao: ${cleanDate}) Tj`,
    '36 460 Td',
    `(- Codigo de Autenticidade Digital: MEYER-DOC-${cleanProtocol}-BR) Tj`,
    '36 445 Td',
    '(- Responsabilidade Tecnica: Equipe Multidisciplinar Meyer Engenharia) Tj',
    'ET',
    // Official stamp box
    '0.92 0.95 0.93 rg',
    '36 330 523 75 re',
    'f',
    '0.70 0.82 0.74 RG',
    '36 330 523 75 re',
    'S',
    'BT',
    '/F1 10 Tf',
    '0.11 0.40 0.25 rg',
    '50 380 Td',
    '(DOCUMENTO VERIFICADO - MEYER ENGENHARIA E CONSULTORIA) Tj',
    '/F2 9 Tf',
    '0.30 0.35 0.30 rg',
    '50 363 Td',
    '(Disponibilizado para download individual pelo proprietario no portal seguro do cliente.) Tj',
    '50 347 Td',
    '(Central de Atendimento: (63) 3213-1121 | comercial@meyerengenharia.com.br) Tj',
    'ET',
    // Footer line
    '0.80 0.80 0.80 RG',
    '36 50 m 559 50 l S',
    'BT',
    '/F2 8 Tf',
    '0.5 0.5 0.5 rg',
    '36 38 Td',
    '(Meyer Engenharia - Portal do Cliente - www.meyerengenharia.com.br) Tj',
    'ET',
  ];

  const contentStream = streamLines.join('\n');
  const streamLength = Buffer.byteLength(contentStream, 'latin1');

  const objects: string[] = [];

  // Object 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');

  // Object 2: Pages
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');

  // Object 3: Page (A4: 595.28 x 841.89)
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj'
  );

  // Object 4: Stream
  objects.push(`4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj`);

  // Object 5: Font F1 (Helvetica-Bold)
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');

  // Object 6: Font F2 (Helvetica)
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');

  let pdfString = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdfString, 'latin1'));
    pdfString += objects[i] + '\n';
  }

  const xrefOffset = Buffer.byteLength(pdfString, 'latin1');
  pdfString += 'xref\n';
  pdfString += `0 ${objects.length + 1}\n`;
  pdfString += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i++) {
    const offsetStr = String(offsets[i]).padStart(10, '0');
    pdfString += `${offsetStr} 00000 n \n`;
  }

  pdfString += 'trailer\n';
  pdfString += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdfString += 'startxref\n';
  pdfString += `${xrefOffset}\n`;
  pdfString += '%%EOF\n';

  return Buffer.from(pdfString, 'latin1');
}
