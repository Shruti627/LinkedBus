package com.redbus.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Service
public class EmailService {

    @Value("${brevo.api.key}")
    private String brevoApiKey;

    @Value("${brevo.from.email}")
    private String senderEmail;

    @Value("${brevo.from.name}")
    private String senderName;

    public void sendEmail(String to, String subject, String body) {

        String url = "https://api.brevo.com/v3/smtp/email";

        RestTemplate restTemplate = new RestTemplate();

        Map<String, Object> payload = new HashMap<>();
        Map<String, String> sender = new HashMap<>();

        sender.put("name", senderName);
        sender.put("email", senderEmail);

        payload.put("sender", sender);

        List<Map<String, String>> toList = new ArrayList<>();
        Map<String, String> toMap = new HashMap<>();
        toMap.put("email", to);
        toList.add(toMap);

        payload.put("to", toList);
        payload.put("subject", subject);
        payload.put("textContent", body);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("api-key", brevoApiKey);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

        restTemplate.postForEntity(url, request, String.class);
    }
}