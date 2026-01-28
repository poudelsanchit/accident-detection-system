import type { Request, Response } from "express"
import { prisma } from "../config/prismaClient"
import puppeteer from "puppeteer"

export const generateAccidentReport = async (req: Request, res: Response) => {
    try {
        const { organizationId } = req.params
        const { startDate, endDate } = req.query

        if (!organizationId) {
            return res.status(400).json({ message: "Organization ID is required" })
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Start date and end date are required" })
        }

        // Fetch organization details
        const organization = await prisma.organization.findUnique({
            where: { id: organizationId as string }
        })

        if (!organization) {
            return res.status(404).json({ message: "Organization not found" })
        }

        // Fetch accidents within date range
        const accidents = await prisma.accident.findMany({
            where: {
                organizationId: organizationId as string,
                occurredAt: {
                    gte: new Date(startDate as string),
                    lte: new Date(endDate as string)
                }
            },
            include: {
                vehicle: {
                    include: {
                        driver: true
                    }
                }
            },
            orderBy: {
                occurredAt: 'desc'
            }
        })

        // Generate HTML for PDF
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            font-size: 10px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        .header h1 {
            font-size: 18px;
            margin-bottom: 5px;
            color: #000;
        }
        .header h2 {
            font-size: 14px;
            color: #666;
            font-weight: normal;
        }
        .info {
            margin-bottom: 15px;
            font-size: 9px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th {
            background-color: #f0f0f0;
            padding: 6px 4px;
            text-align: left;
            font-size: 9px;
            border: 1px solid #ddd;
            font-weight: bold;
        }
        td {
            padding: 5px 4px;
            border: 1px solid #ddd;
            font-size: 8px;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .status {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 7px;
            font-weight: bold;
        }
        .status-reported {
            background-color: #fee;
            color: #c00;
        }
        .status-confirmed {
            background-color: #fef3cd;
            color: #856404;
        }
        .status-resolved {
            background-color: #d4edda;
            color: #155724;
        }
        .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 8px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
        .summary {
            margin-bottom: 15px;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 4px;
        }
        .summary-item {
            display: inline-block;
            margin-right: 20px;
            font-size: 9px;
        }
        .summary-item strong {
            color: #000;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${organization.name}</h1>
        <h2>Accident Report</h2>
    </div>
    
    <div class="info">
        <div class="info-row">
            <span><strong>Organization Type:</strong> ${organization.organizationType}</span>
            <span><strong>Report Generated:</strong> ${new Date().toLocaleString()}</span>
        </div>
        <div class="info-row">
            <span><strong>Address:</strong> ${organization.address}</span>
            <span><strong>Phone:</strong> ${organization.phoneNumber}</span>
        </div>
        <div class="info-row">
            <span><strong>Period:</strong> ${new Date(startDate as string).toLocaleDateString()} - ${new Date(endDate as string).toLocaleDateString()}</span>
        </div>
    </div>

    <div class="summary">
        <div class="summary-item"><strong>Total Accidents:</strong> ${accidents.length}</div>
        <div class="summary-item"><strong>Reported:</strong> ${accidents.filter(a => a.status === 'REPORTED').length}</div>
        <div class="summary-item"><strong>Confirmed:</strong> ${accidents.filter(a => a.status === 'CONFIRMED').length}</div>
        <div class="summary-item"><strong>Resolved:</strong> ${accidents.filter(a => a.status === 'RESOLVED').length}</div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 8%;">Date</th>
                <th style="width: 8%;">Time</th>
                <th style="width: 15%;">Vehicle</th>
                <th style="width: 12%;">Driver</th>
                <th style="width: 20%;">Location</th>
                <th style="width: 25%;">Description</th>
                <th style="width: 12%;">Status</th>
            </tr>
        </thead>
        <tbody>
            ${accidents.length === 0 ? `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 20px;">
                        No accidents recorded during this period
                    </td>
                </tr>
            ` : accidents.map(accident => `
                <tr>
                    <td>${new Date(accident.occurredAt).toLocaleDateString()}</td>
                    <td>${new Date(accident.occurredAt).toLocaleTimeString()}</td>
                    <td>${accident.vehicle.vehicleNumber} (${accident.vehicle.vehicleType})</td>
                    <td>${accident.vehicle.driver.fullName || accident.vehicle.driver.phoneNumber}</td>
                    <td>${accident.latitude.toFixed(6)}, ${accident.longitude.toFixed(6)}</td>
                    <td>${accident.description || accident.title}</td>
                    <td>
                        <span class="status status-${accident.status.toLowerCase()}">
                            ${accident.status}
                        </span>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>This is a computer-generated report from ${organization.name}</p>
        <p>Generated on ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
        `

        // Launch Puppeteer and generate PDF
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })
        
        const page = await browser.newPage()
        await page.setContent(html, { waitUntil: 'networkidle0' })
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '10mm',
                right: '10mm',
                bottom: '10mm',
                left: '10mm'
            }
        })
        
        await browser.close()

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="accident-report-${organizationId}-${Date.now()}.pdf"`)
        res.send(pdfBuffer)

    } catch (err: any) {
        console.error("Error generating report:", err.message)
        return res.status(500).json({ message: "Internal server error" })
    }
}
