package com.redbus.admincontroller;

import com.redbus.payment.Payment;
import com.redbus.payment.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin-api/payments")

@CrossOrigin(origins = "*")
public class AdminPaymentController {

    @Autowired
    private PaymentRepository paymentRepository;

    @GetMapping
    public List<Payment> getAllPayments() {
        List<Payment> payments = paymentRepository.findAll();

        // Force initialize user name (optional)
        payments.forEach(p -> {
            if (p.getUser() != null) {
                p.getUser().getName(); // triggers lazy load
            }
        });

        return payments;
    }
}
