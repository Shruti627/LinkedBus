package com.redbus.payment;

import com.razorpay.Order;
import com.razorpay.Payment;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class RazorpayService {

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpaySecret;

    /** ✅ Create a Razorpay order and return it */
    public Order createOrder(Double amount, String email, String contact) throws RazorpayException {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Invalid payment amount: " + amount);
        }

        int amountInPaise = (int) Math.round(amount * 100);
        if (amountInPaise < 100) {
            throw new IllegalArgumentException("Razorpay minimum order amount is ₹1");
        }

        RazorpayClient client = new RazorpayClient(razorpayKeyId.trim(), razorpaySecret.trim());

        JSONObject orderRequest = new JSONObject();
        orderRequest.put("amount", amountInPaise);
        orderRequest.put("currency", "INR");
        orderRequest.put("receipt", "txn_" + System.currentTimeMillis());
        orderRequest.put("payment_capture", 1);

        Order order = client.orders.create(orderRequest);
        System.out.println("✅ Razorpay Order Created: " + order.get("id"));
        return order;
    }

    public String getKeyId() {
        return razorpayKeyId;
    }

    /** ✅ Verify Razorpay signature & confirm payment is captured */
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", orderId);
            attributes.put("razorpay_payment_id", paymentId);
            attributes.put("razorpay_signature", signature);

            Utils.verifyPaymentSignature(attributes, razorpaySecret.trim());

            RazorpayClient client = new RazorpayClient(razorpayKeyId.trim(), razorpaySecret.trim());
            Payment payment = client.payments.fetch(paymentId);
            String status = payment.get("status");

            System.out.println("✅ Payment Status from Razorpay: " + status);
            return "captured".equalsIgnoreCase(status);
        } catch (Exception e) {
            System.err.println("❌ Razorpay Signature Verification Failed: " + e.getMessage());
            return false;
        }
    }
}
