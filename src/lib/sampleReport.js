// Sample tree-services site-visit report PDF generator.
//
// Lazy-loaded — only imported when the user clicks "Preview PDF" so the
// jsPDF + autotable bundle (~177KB gzipped) doesn't ship on the main JS.
//
// Returns a Blob URL that opens in a new tab. Pass `business` for live
// branding (name, brand_colour, cert_membership, website, email).

export async function generateSampleReportPDF(business = {}) {
  const [{ default: jsPDF }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const brand = business.brand_colour || '#22c55e'
  const name = business.name || 'Your Tree Services Ltd'
  const cert = business.cert_membership || 'Arboricultural Assoc · #4471'
  const website = business.website || 'yourtree.com.au'
  const email = business.email || 'jobs@yourtree.com.au'

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 48 // margin

  // ─── COVER STRIP (brand colour) ────────────────────────────────────────
  doc.setFillColor(brand)
  doc.rect(0, 0, W, 8, 'F')

  // ─── HEADER ────────────────────────────────────────────────────────────
  // Brand monogram
  doc.setFillColor(brand)
  doc.roundedRect(M, M, 36, 36, 6, 6, 'F')
  doc.setTextColor('#ffffff')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(name.charAt(0).toUpperCase(), M + 18, M + 23, { align: 'center' })

  // Cert eyebrow + business name
  doc.setTextColor(brand)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(cert.toUpperCase(), M + 50, M + 14)

  doc.setTextColor('#0f1118')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(name, M + 50, M + 30)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor('#6b7280')
  doc.text(`${website}  ·  ${email}`, M + 50, M + 44)

  // ─── REPORT META (right side) ──────────────────────────────────────────
  const metaX = W - M
  doc.setFontSize(8)
  doc.setTextColor('#6b7280')
  doc.text('SITE VISIT REPORT', metaX, M + 14, { align: 'right' })

  doc.setFontSize(11)
  doc.setTextColor('#0f1118')
  doc.setFont('helvetica', 'bold')
  doc.text('REF · TM-2041', metaX, M + 30, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor('#6b7280')
  doc.text(new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }), metaX, M + 44, { align: 'right' })

  // ─── DIVIDER ───────────────────────────────────────────────────────────
  doc.setDrawColor('#e5e7eb')
  doc.setLineWidth(0.5)
  doc.line(M, M + 64, W - M, M + 64)

  // ─── CLIENT + SITE ─────────────────────────────────────────────────────
  let y = M + 90

  doc.setFontSize(8)
  doc.setTextColor(brand)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENT', M, y)
  doc.text('SITE', M + 240, y)

  doc.setFontSize(11)
  doc.setTextColor('#0f1118')
  doc.text('Glen Wright', M, y + 16)
  doc.text('12 Riverbank Way', M + 240, y + 16)

  doc.setFontSize(9)
  doc.setTextColor('#6b7280')
  doc.setFont('helvetica', 'normal')
  doc.text('0412 345 678 · glen@example.com', M, y + 30)
  doc.text('Access via rear lane', M + 240, y + 30)

  // ─── TREE DETAILS (AS 4373) ────────────────────────────────────────────
  y += 70
  doc.setFontSize(8)
  doc.setTextColor(brand)
  doc.setFont('helvetica', 'bold')
  doc.text('TREE DETAILS · AS 4373', M, y)
  y += 14

  // 4-column meta grid
  const metaCols = [
    ['SPECIES',  'Spotted Gum (Corymbia maculata)'],
    ['DBH',      '72 cm'],
    ['HEIGHT',   '24 m'],
    ['SPREAD',   '14 m'],
    ['AS 4373',  'Type 2 (Selective prune)'],
    ['HAZARDS',  'Power lines (0.8m)'],
  ]
  const colW = (W - M * 2) / 3
  metaCols.forEach((row, i) => {
    const col = i % 3
    const r   = Math.floor(i / 3)
    const x = M + col * colW
    const yy = y + r * 30
    doc.setFontSize(7.5)
    doc.setTextColor('#9ca3af')
    doc.setFont('helvetica', 'bold')
    doc.text(row[0], x, yy)
    doc.setFontSize(10)
    doc.setTextColor('#0f1118')
    doc.setFont('helvetica', 'normal')
    doc.text(row[1], x, yy + 13)
  })
  y += 70

  // ─── LINE ITEMS TABLE ──────────────────────────────────────────────────
  doc.setFontSize(8)
  doc.setTextColor(brand)
  doc.setFont('helvetica', 'bold')
  doc.text('LINE ITEMS', M, y)
  y += 6

  const lineItems = [
    ['Crew · 2 climbers · 5h',     '£820'],
    ['EWP · 4h',                    '£480'],
    ['Chipper hire · day',          '£220'],
    ['Tip + greenwaste',            '£120'],
    ['Permit liaison · council',    '£200'],
  ]

  doc.autoTable({
    startY: y + 4,
    head: [['Description', 'Amount']],
    body: lineItems,
    margin: { left: M, right: M },
    styles: { font: 'helvetica', fontSize: 9.5, cellPadding: 7, lineColor: '#e5e7eb', lineWidth: 0.4 },
    headStyles: { fillColor: '#f9fafb', textColor: '#6b7280', fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { textColor: '#0f1118' },
    columnStyles: { 1: { halign: 'right', cellWidth: 100 } },
    theme: 'plain',
  })

  // ─── TOTAL ─────────────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY || y + 60
  doc.setDrawColor('#0f1118')
  doc.setLineWidth(1)
  doc.line(W - M - 200, finalY + 18, W - M, finalY + 18)

  doc.setFontSize(9)
  doc.setTextColor('#6b7280')
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL', W - M - 200, finalY + 36)

  doc.setFontSize(18)
  doc.setTextColor(brand)
  doc.text('£1,840', W - M, finalY + 38, { align: 'right' })

  // ─── SIGNATURE PLACEHOLDERS ────────────────────────────────────────────
  const sigY = finalY + 80
  doc.setFontSize(8)
  doc.setTextColor('#9ca3af')
  doc.setFont('helvetica', 'bold')
  doc.text('ARBORIST SIGNATURE', M, sigY)
  doc.text('CUSTOMER SIGNATURE', M + 240, sigY)

  doc.setDrawColor('#d1d5db')
  doc.setLineWidth(0.5)
  doc.line(M, sigY + 50, M + 200, sigY + 50)
  doc.line(M + 240, sigY + 50, M + 240 + 200, sigY + 50)

  doc.setFontSize(8)
  doc.setTextColor('#9ca3af')
  doc.setFont('helvetica', 'normal')
  doc.text('Sample · signature placeholder', M, sigY + 64)
  doc.text('Sample · signature placeholder', M + 240, sigY + 64)

  // ─── FOOTER ────────────────────────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight()
  doc.setDrawColor('#e5e7eb')
  doc.setLineWidth(0.5)
  doc.line(M, pageH - M - 14, W - M, pageH - M - 14)

  doc.setFontSize(7.5)
  doc.setTextColor('#9ca3af')
  doc.setFont('helvetica', 'normal')
  doc.text('Generated by TreeMate · sample report', M, pageH - M)
  doc.text(`${name} · ${cert}`, W - M, pageH - M, { align: 'right' })

  // Output as Blob URL
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}
