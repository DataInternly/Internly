#!/usr/bin/env python3
"""
GENERATE BBL LEERAGREEMENT PLACEHOLDERS — Internly livetest 11 mei 2026

Genereert PDF-placeholders voor 5 BBL-studenten. Output naar
scripts/output/leeragreement-<slug>.pdf. Volgende stap is
scripts/seed-leeragreementen.js dat de PDFs uploadt naar Supabase.

Vereiste:
    pip install reportlab

Run vanuit project root:
    python scripts/generate-bbl-placeholder.py

Geen DB-connectie nodig — student-data is hardcoded zodat dit script
offline draait. Echte profile_id-koppeling gebeurt in seed-script.
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, grey
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


STUDENTEN = [
    {
        'naam': 'Koen BBL',
        'opleiding': 'MBO Detailhandel niveau 3',
        'leerbedrijf': 'Nog in te vullen',
        'periode': 'Nog in te vullen',
    },
    {
        'naam': 'Rik BBL',
        'opleiding': 'MBO Logistiek niveau 3',
        'leerbedrijf': 'Nog in te vullen',
        'periode': 'Nog in te vullen',
    },
    {
        'naam': 'Pepijn BBL',
        'opleiding': 'MBO Zorg & Welzijn niveau 3',
        'leerbedrijf': 'Nog in te vullen',
        'periode': 'Nog in te vullen',
    },
    {
        'naam': 'Patrick BBL',
        'opleiding': 'MBO ICT niveau 3',
        'leerbedrijf': 'Nog in te vullen',
        'periode': 'Nog in te vullen',
    },
    {
        'naam': 'Daan Hendriks',
        'opleiding': 'MBO Administratie niveau 3',
        'leerbedrijf': 'Nog in te vullen',
        'periode': 'Nog in te vullen',
    },
]

DATUM_GEN = '11 mei 2026'
INTERNLY_GREEN = HexColor('#1a7a48')
INTERNLY_INK = HexColor('#0d1520')


def slugify(naam):
    return naam.lower().replace(' ', '-').replace('.', '')


def maak_pdf(student, output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=2.5 * cm,
        bottomMargin=2 * cm,
        leftMargin=2.5 * cm,
        rightMargin=2.5 * cm,
        title=f'Leeragreement — {student["naam"]}',
    )

    styles = getSampleStyleSheet()
    h1 = ParagraphStyle('H1', parent=styles['Heading1'],
                        fontSize=18, leading=22, textColor=INTERNLY_GREEN, spaceAfter=18)
    h2 = ParagraphStyle('H2', parent=styles['Heading2'],
                        fontSize=11, leading=14, textColor=INTERNLY_INK,
                        spaceBefore=14, spaceAfter=6)
    footer_st = ParagraphStyle('Footer', parent=styles['BodyText'],
                                fontSize=8, leading=11, textColor=grey, spaceBefore=24)

    def kv_table(rows):
        tbl = Table(rows, colWidths=[4.5 * cm, 10.5 * cm])
        tbl.setStyle(TableStyle([
            ('FONT', (0, 0), (-1, -1), 'Helvetica', 10),
            ('TEXTCOLOR', (0, 0), (0, -1), grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        return tbl

    story = [
        Paragraph('LEERAGREEMENT &mdash; INTERNLY.PRO', h1),
        Spacer(1, 0.4 * cm),
        Paragraph('Studentgegevens', h2),
        kv_table([
            ['Naam', student['naam']],
            ['Opleiding', student['opleiding']],
        ]),
        Paragraph('Leerbedrijf', h2),
        kv_table([
            ['Naam', student['leerbedrijf']],
            ['Periode', student['periode']],
        ]),
        Paragraph('Document', h2),
        kv_table([
            ['Datum gegenereerd', DATUM_GEN],
            ['Versie', '1.0 - placeholder voor livetest'],
        ]),
        Spacer(1, 1.5 * cm),
        Paragraph(
            'Dit is een testdocument voor de Internly livetest van 11 mei 2026.',
            footer_st
        ),
        Paragraph(
            'Geen wettelijke of pedagogische geldigheid &mdash; vervang v&oacute;&oacute;r '
            'productie door het offici&euml;le leeragreement van het ROC.',
            footer_st
        ),
    ]
    doc.build(story)


def main():
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'output')
    os.makedirs(output_dir, exist_ok=True)

    print(f'Genereer {len(STUDENTEN)} placeholder leeragreementen')
    print(f'Output: {output_dir}\n')

    for student in STUDENTEN:
        slug = slugify(student['naam'])
        path = os.path.join(output_dir, f'leeragreement-{slug}.pdf')
        maak_pdf(student, path)
        print(f'  OK  {os.path.basename(path)}')

    print(f'\nKlaar. Volgende: node scripts/seed-leeragreementen.js')


if __name__ == '__main__':
    main()
