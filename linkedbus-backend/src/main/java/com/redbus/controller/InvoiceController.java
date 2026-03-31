package com.redbus.controller;

import com.redbus.dto.BookingDTO;
import com.redbus.dto.SeatDTO;
import com.redbus.dto.BusDTO;
import com.redbus.service.BookingService;
import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletResponse;

import java.awt.Color;
import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class InvoiceController {

    private static final Logger log = LoggerFactory.getLogger(InvoiceController.class);
    private final BookingService bookingService;

    // company info
    private static final String COMPANY_NAME = "Linked Bus Pvt. Ltd.";
    private static final String COMPANY_ADDRESS = "123, MG Road, Pune - 411001";
    private static final String COMPANY_PHONE = "+91-9890656246";
    private static final String COMPANY_EMAIL = "inamdarsahi708@gmail.com";

    public InvoiceController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping("/{id}/invoice")
    public void generateInvoice(@PathVariable("id") Long id, HttpServletResponse response) {
        try {
            BookingDTO booking = bookingService.getBookingById(id);
            if (booking == null) {
                response.setStatus(HttpServletResponse.SC_NOT_FOUND);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"error\":\"Booking not found\"}");
                return;
            }

            // fetch passenger name (lightweight repository call via service)
            String passengerName = bookingService.getBookingUserName(id);

            response.setContentType(MediaType.APPLICATION_PDF_VALUE);
            String filename = "invoice-" + id + ".pdf";
            response.setHeader(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"");

            OutputStream os = response.getOutputStream();
            Document document = new Document(PageSize.A4, 36, 36, 72, 36); // margins: left,right,top,bottom
            PdfWriter writer = PdfWriter.getInstance(document, os);
            writer.setViewerPreferences(PdfWriter.PageModeUseThumbs);

            document.open();

            // fonts
            Font h1 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
            Font h2 = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12);
            Font bold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            Font normal = FontFactory.getFont(FontFactory.HELVETICA, 10);
            Font small = FontFactory.getFont(FontFactory.HELVETICA, 9);

            // currency formatter (INR)
            NumberFormat currency = NumberFormat.getCurrencyInstance(new Locale("en", "IN"));

            // --- Header (logo + company) ---
            PdfPTable header = new PdfPTable(2);
            header.setWidthPercentage(100);
            header.setWidths(new float[]{1.5f, 4.5f});
            header.getDefaultCell().setBorder(Rectangle.NO_BORDER);

            // logo cell (optional) - try to load from resources, else show blank
            PdfPCell logoCell = new PdfPCell();
            logoCell.setBorder(Rectangle.NO_BORDER);
            logoCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
            try {
                // place logo.png in src/main/resources/static/logo.png OR classpath root
                InputStream logoStream = getClass().getResourceAsStream("/logo.png");
                if (logoStream != null) {
                    Image logo = Image.getInstance(org.apache.commons.io.IOUtils.toByteArray(logoStream));
                    logo.scaleToFit(80, 50);
                    logoCell.addElement(logo);
                } else {
                    // small placeholder text if no logo found
                    Paragraph p = new Paragraph(COMPANY_NAME, bold);
                    logoCell.addElement(p);
                }
            } catch (Exception ex) {
                logoCell.addElement(new Paragraph(COMPANY_NAME, bold));
            }
            header.addCell(logoCell);

            // company details cell
            PdfPCell compCell = new PdfPCell();
            compCell.setBorder(Rectangle.NO_BORDER);
            compCell.addElement(new Paragraph(COMPANY_NAME, h1));
            compCell.addElement(new Paragraph(COMPANY_ADDRESS, small));
            compCell.addElement(new Paragraph("Phone: " + COMPANY_PHONE + " | Email: " + COMPANY_EMAIL, small));
            header.addCell(compCell);

            document.add(header);
            document.add(Chunk.NEWLINE);

            // --- Invoice title and meta ---
            PdfPTable meta = new PdfPTable(2);
            meta.setWidthPercentage(100);
            meta.setWidths(new float[]{3f, 2f});
            meta.getDefaultCell().setBorder(Rectangle.NO_BORDER);

            PdfPCell left = new PdfPCell();
            left.setBorder(Rectangle.NO_BORDER);
            left.addElement(new Paragraph("INVOICE", h2));
            left.addElement(new Paragraph("Booking ID: " + booking.id(), bold));
            left.addElement(new Paragraph("Status: " + nullToEmpty(booking.status()), normal));
            left.addElement(new Paragraph("Booking Time: " + (booking.bookingTime() != null ?
                    booking.bookingTime().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")) : ""), normal));
            left.addElement(Chunk.NEWLINE);
            meta.addCell(left);

            PdfPCell right = new PdfPCell();
            right.setBorder(Rectangle.NO_BORDER);
            right.setHorizontalAlignment(Element.ALIGN_RIGHT);
            // invoice number: can be booking id prefixed
            right.addElement(new Paragraph("Invoice No: INV-" + booking.id(), bold));
            right.addElement(new Paragraph("Issue Date: " + java.time.LocalDate.now().format(DateTimeFormatter.ISO_DATE), normal));
            right.addElement(Chunk.NEWLINE);
            right.addElement(new Paragraph("Payment Status: " + (booking.status() != null ? booking.status() : "NA"), normal));
            meta.addCell(right);

            document.add(meta);
            document.add(Chunk.NEWLINE);

            // --- Passenger / Bus details in two columns ---
            PdfPTable details = new PdfPTable(2);
            details.setWidthPercentage(100);
            details.setWidths(new float[]{1f, 1f});
            details.setSpacingBefore(6f);
            details.setSpacingAfter(6f);

            PdfPCell p1 = new PdfPCell();
            p1.setBorder(Rectangle.BOX);
            p1.setPadding(8f);
            p1.addElement(new Paragraph("Passenger Details", bold));
            p1.addElement(new Paragraph("Name: " + nullToEmpty(passengerName), normal));
            p1.addElement(new Paragraph("Seats: " + seatsSummary(booking), normal));
            details.addCell(p1);

            PdfPCell p2 = new PdfPCell();
            p2.setBorder(Rectangle.BOX);
            p2.setPadding(8f);
            p2.addElement(new Paragraph("Journey Details", bold));
            BusDTO bus = booking.bus();
            if (bus != null) {
                p2.addElement(new Paragraph("Bus: " + nullToEmpty(bus.busName()), normal));
                p2.addElement(new Paragraph("Route: " + nullToEmpty(bus.source()) + " → " +
                        nullToEmpty(bus.destination()), normal));
                p2.addElement(new Paragraph("Departure: " + (bus.departureTime() != null ? bus.departureTime().toString() : ""), normal));
            } else {
                p2.addElement(new Paragraph("-", normal));
            }
            details.addCell(p2);

            document.add(details);
            document.add(Chunk.NEWLINE);

            // --- Seats table with header styling ---
            PdfPTable table = new PdfPTable(new float[]{1f, 3f, 2f});
            table.setWidthPercentage(100);
            table.setSpacingBefore(6f);
            table.setSpacingAfter(6f);

            PdfPCell th;

            th = new PdfPCell(new Phrase("S.No", bold));
            th.setHorizontalAlignment(Element.ALIGN_CENTER);
            th.setBackgroundColor(new Color(230, 230, 230));
            th.setPadding(6f);
            table.addCell(th);

            th = new PdfPCell(new Phrase("Seat No", bold));
            th.setHorizontalAlignment(Element.ALIGN_CENTER);
            th.setBackgroundColor(new Color(230, 230, 230));
            th.setPadding(6f);
            table.addCell(th);

            th = new PdfPCell(new Phrase("Price (INR)", bold));
            th.setHorizontalAlignment(Element.ALIGN_CENTER);
            th.setBackgroundColor(new Color(230, 230, 230));
            th.setPadding(6f);
            table.addCell(th);

            List<SeatDTO> seats = booking.seats();
            BigDecimal sum = BigDecimal.ZERO;
            if (seats != null && !seats.isEmpty()) {
                int i = 1;
                for (SeatDTO s : seats) {
                    String seatNo = s.seatNumber() != null ? s.seatNumber() : "";
                    BigDecimal price = s.price();

                    PdfPCell c1 = new PdfPCell(new Phrase(String.valueOf(i), normal));
                    c1.setHorizontalAlignment(Element.ALIGN_CENTER);
                    c1.setPadding(6f);
                    table.addCell(c1);

                    PdfPCell c2 = new PdfPCell(new Phrase(nullToEmpty(seatNo), normal));
                    c2.setPadding(6f);
                    table.addCell(c2);

                    PdfPCell c3 = new PdfPCell(new Phrase(price != null ? currency.format(price) : "-", normal));
                    c3.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    c3.setPadding(6f);
                    table.addCell(c3);

                    if (price != null) sum = sum.add(price);
                    i++;
                }
            } else {
                PdfPCell nc = new PdfPCell(new Phrase("No seats", normal));
                nc.setColspan(3);
                nc.setPadding(8f);
                table.addCell(nc);
            }

            // totals row
            PdfPCell totalLabel = new PdfPCell(new Phrase("Total", bold));
            totalLabel.setColspan(2);
            totalLabel.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalLabel.setPadding(8f);
            table.addCell(totalLabel);

            PdfPCell totalVal = new PdfPCell(new Phrase(currency.format(sum), bold));
            totalVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            totalVal.setPadding(8f);
            table.addCell(totalVal);

            document.add(table);

            // Payment / footer info
            Paragraph pay = new Paragraph();
            pay.setSpacingBefore(8f);
            pay.add(new Phrase("Payment Method: " + tryGetPaymentMethod(booking), normal));
            pay.add(Chunk.NEWLINE);
            pay.add(new Phrase("Thank you for booking with " + COMPANY_NAME + ". For support, contact " + COMPANY_EMAIL + " or call " + COMPANY_PHONE, small));
            document.add(pay);

            // small footer line
            Paragraph footer = new Paragraph("This is a computer-generated invoice and does not require signature.", small);
            footer.setSpacingBefore(18f);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            os.flush();
        } catch (Exception e) {
            log.error("Error generating invoice for booking " + id, e);
            try {
                response.reset();
                response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                response.getWriter().write("{\"error\":\"Failed to generate invoice\"}");
            } catch (Exception ex) {
                log.error("Also failed writing error response", ex);
            }
        }
    }

    // --- helpers ---

    private String nullToEmpty(Object o) {
        return o == null ? "" : o.toString();
    }

    private String tryGetBookingName(BookingDTO booking) {
        // kept for backward compatibility but not used anymore
        return "";
    }

    private String seatsSummary(BookingDTO booking) {
        List<SeatDTO> seats = booking.seats();
        if (seats == null || seats.isEmpty()) return "-";
        StringBuilder sb = new StringBuilder();
        for (SeatDTO s : seats) {
            String seatNo = s.seatNumber() != null ? s.seatNumber() : "";
            if (sb.length() > 0) sb.append(", ");
            sb.append(seatNo);
        }
        return sb.toString();
    }

    private String tryGetPaymentMethod(BookingDTO booking) {
        // adjust if BookingDTO contains payment info
        return "Prepaid";
    }

    private BigDecimal parseBigDecimal(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            // try removing non-digits except dot and minus
            String clean = s.replaceAll("[^0-9.\\-]", "");
            if (clean.isBlank()) return null;
            return new BigDecimal(clean);
        } catch (Exception e) {
            return null;
        }
    }
}
