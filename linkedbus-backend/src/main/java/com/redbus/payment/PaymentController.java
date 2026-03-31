package com.redbus.payment;

import com.razorpay.Order;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Handles Razorpay order creation and payment verification.
 * Integrates cleanly with BookingService through payment_record_id.
 */
@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final RazorpayService razorpayService;
    private final PaymentService paymentService;

    public PaymentController(RazorpayService razorpayService, PaymentService paymentService) {
        this.razorpayService = razorpayService;
        this.paymentService = paymentService;
    }

    /**
     * ✅ Create Razorpay Order + Save Payment record in DB
     */
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> data) {
        try {
            // --- Validation ---
            if (data == null || !data.containsKey("amount")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required field: amount"));
            }

            Double amount = Double.parseDouble(data.get("amount").toString());
            if (amount <= 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid amount: must be > 0"));
            }

            String email = Objects.toString(data.get("email"), "test@example.com");
            String contact = Objects.toString(data.get("contact"), "9999999999");
            Long userId = data.containsKey("userId") ? Long.valueOf(data.get("userId").toString()) : null;
            Long busId = data.containsKey("busId") ? Long.valueOf(data.get("busId").toString()) : null;

            // Convert seatNumbers to List<String>
            List<String> seatNumbers = new ArrayList<>();
            Object seatObj = data.get("seatNumbers");
            if (seatObj instanceof List<?>) {
                ((List<?>) seatObj).forEach(s -> seatNumbers.add(String.valueOf(s)));
            }

            // --- Create Razorpay Order ---
            Order order = razorpayService.createOrder(amount, email, contact);
            String orderId = order.get("id").toString(); // ✅ Convert explicitly to String

            // --- Save Payment in DB ---
            Payment payment = paymentService.findByOrderId(orderId);
            if (payment == null) {
                payment = new Payment();
                payment.setOrderId(orderId);
            }

            payment.setAmount(amount);
            payment.setEmail(email);
            payment.setContact(contact);
            payment.setStatus("CREATED");
            payment.setUserId(userId);
            payment.setBusId(busId);
            payment.setSeatNumbers(String.join(",", seatNumbers));
            paymentService.save(payment);

            log.info("✅ Razorpay Order Created: orderId={}, amount={}, userId={}, busId={}, seats={}",
                    orderId, amount, userId, busId, seatNumbers);

            // --- Send response to frontend ---
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "orderId", orderId,
                    "paymentRecordId", payment.getId(), // ✅ use this when booking later
                    "amount", amount,
                    "currency", order.get("currency").toString(),
                    "message", "Order created successfully"
            ));

        } catch (Exception e) {
            log.error("❌ Error creating Razorpay order", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    /**
     * ✅ Verify Razorpay Payment + Update status in DB
     */
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody Map<String, String> data) {
        try {
            String orderId = data.get("orderId");
            String paymentId = data.get("paymentId");
            String signature = data.get("signature");

            if (orderId == null || paymentId == null || signature == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required Razorpay fields"));
            }

            // --- Verify signature with Razorpay ---
            boolean valid = razorpayService.verifySignature(orderId, paymentId, signature);
            Payment payment = paymentService.findByOrderId(orderId);

            if (payment == null) {
                log.warn("⚠️ No payment found for orderId={}", orderId);
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Payment not found for orderId: " + orderId));
            }

            // --- Update Payment row ---
            payment.setPaymentId(paymentId);
            payment.setStatus(valid ? "SUCCESS" : "FAILED");
            paymentService.save(payment);

            if (valid) {
                log.info("✅ Payment Verified: orderId={}, paymentId={}, userId={}, busId={}, seats={}",
                        orderId, paymentId, payment.getUserId(), payment.getBusId(), payment.getSeatNumbers());
            } else {
                log.warn("❌ Payment Verification Failed: orderId={}, paymentId={}", orderId, paymentId);
            }

            // --- Respond to frontend ---
            return ResponseEntity.ok(Map.of(
                    "success", valid,
                    "orderId", orderId,
                    "paymentId", paymentId,
                    "status", valid ? "SUCCESS" : "FAILED",
                    "paymentRecordId", payment.getId(),
                    "message", valid ? "Payment verified successfully" : "Payment verification failed"
            ));

        } catch (Exception e) {
            log.error("❌ Error verifying Razorpay payment", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "error", e.getMessage()));
        }
    }
}
