package com.redbus.payment;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Handles persistence and linking of payments in our DB.
 */
@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;

    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    /** ✅ Save or update a Payment row */
    public Payment save(Payment payment) {
        return paymentRepository.save(payment);
    }

    /** ✅ Find payment by ID */
    public Payment findById(Long id) {
        if (id == null) return null;
        return paymentRepository.findById(id).orElse(null);
    }

    /** ✅ Find payment by order ID */
    public Payment findByOrderId(String orderId) {
        if (orderId == null || orderId.isBlank()) return null;
        return paymentRepository.findByOrderId(orderId);
    }

    /**
     * ✅ Mark payment verified after Razorpay success.
     * If no payment exists for this orderId, creates one.
     */
    @Transactional
    public boolean markPaymentVerified(String orderId, String paymentId, boolean valid) {
        Payment p = paymentRepository.findByOrderId(orderId);
        if (p == null) {
            p = new Payment();
            p.setOrderId(orderId);
            p.setCreatedAt(LocalDateTime.now());
        }

        p.setPaymentId(paymentId);
        p.setStatus(valid ? "SUCCESS" : "FAILED");
        paymentRepository.save(p);

        System.out.println(valid ? "✅ Payment verified successfully" : "❌ Payment verification failed");
        return valid;
    }

    /** ✅ Convenience: mark payment manually as failed */
    @Transactional
    public void markPaymentFailed(Long id, String reason) {
        Payment p = findById(id);
        if (p == null) return;
        p.setStatus("FAILED");
        paymentRepository.save(p);
        System.out.println("❌ Payment marked FAILED (" + id + "): " + reason);
    }

    /** ✅ Link booking to payment (optional if schema supports it) */
    @Transactional
    public void attachBooking(Long paymentId, Long bookingId) {
        Payment p = findById(paymentId);
        if (p == null) return;
        // p.setBookingId(bookingId); // add in entity if needed
        paymentRepository.save(p);
    }
}
