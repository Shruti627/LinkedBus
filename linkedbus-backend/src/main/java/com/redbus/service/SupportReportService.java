package com.redbus.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.redbus.dto.SupportReportDTO;
import com.redbus.model.SupportReport;
import com.redbus.repository.SupportReportRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Service
public class SupportReportService {

    private static final Logger log = LoggerFactory.getLogger(SupportReportService.class);

    private final SupportReportRepository repository;
    private final ObjectMapper objectMapper;
    private final Optional<JavaMailSender> mailSender;
    private final String notifyEmail;

    // Limits
    private static final int MAX_SUBJECT = 250;
    private static final int MAX_DESCRIPTION = 16_000;
    private static final int MAX_URL = 2048;
    private static final int MAX_USERAGENT = 1024;
    private static final int MAX_METADATA_STORE = 200_000; // 200KB storage cap
    private static final int MAX_METADATA_EMAIL_SNIPPET = 500; // snippet length in email

    public SupportReportService(SupportReportRepository repository,
                                ObjectMapper objectMapper,
                                java.util.Optional<JavaMailSender> mailSender,
                                org.springframework.core.env.Environment env) {
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.mailSender = mailSender;
        this.notifyEmail = env.getProperty("support.notify.email", "inamdarsahil708@gmail.com");
    }

    @Transactional
    public SupportReport saveReport(SupportReportDTO dto) {
        if (dto == null) throw new IllegalArgumentException("report required");

        SupportReport r = new SupportReport();
        r.setSubject(safeTrim(dto.subject(), MAX_SUBJECT, "No subject provided"));
        r.setDescription(safeTrim(dto.description(), MAX_DESCRIPTION, "No description provided"));
        r.setUrl(safeTrim(dto.url(), MAX_URL, null));
        r.setUserAgent(safeTrim(dto.userAgent(), MAX_USERAGENT, null));
        r.setCreatedAt(OffsetDateTime.now());

        // Defensive metadata serialization + trimming for storage
        if (dto.metadata() != null) {
            try {
                String metaJson = objectMapper.writeValueAsString(dto.metadata());
                if (metaJson.length() > MAX_METADATA_STORE) {
                    metaJson = metaJson.substring(0, MAX_METADATA_STORE) + "...[truncated]";
                }
                r.setMetadata(metaJson);
            } catch (Exception e) {
                log.warn("Failed to serialize metadata for support report (will store fallback): {}", e.getMessage());
                // fallback: store safe toString limited
                r.setMetadata(safeTrim(String.valueOf(dto.metadata()), MAX_METADATA_STORE, null));
            }
        } else {
            r.setMetadata(null);
        }

        // User JSON (if present)
        if (dto.user() != null) {
            try {
                String userJson = objectMapper.writeValueAsString(dto.user());
                r.setUserJson(safeTrim(userJson, 32_000, null));
            } catch (Exception e) {
                log.warn("Failed to serialize user JSON: {}", e.getMessage());
                r.setUserJson(safeTrim(String.valueOf(dto.user()), 32_000, null));
            }
        } else {
            r.setUserJson(null);
        }

        SupportReport saved = repository.save(r);
        log.info("Saved support report id={}", saved.getId());

        // send notification (email) but do NOT include full metadata
        trySendNotificationEmail(saved);

        return saved;
    }

    private void trySendNotificationEmail(SupportReport saved) {
        if (mailSender.isEmpty()) {
            log.info("JavaMailSender not configured — skipping email notification for support report id={}", saved.getId());
            return;
        }

        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(notifyEmail);
            msg.setSubject("New Support Report: " + saved.getSubject());

            StringBuilder body = new StringBuilder();
            body.append("Support report id: ").append(saved.getId()).append("\n");
            body.append("Subject: ").append(saved.getSubject()).append("\n\n");
            body.append("Description:\n").append(saved.getDescription()).append("\n\n");
            body.append("URL: ").append(saved.getUrl() != null ? saved.getUrl() : "n/a").append("\n");
            body.append("UserAgent: ").append(saved.getUserAgent() != null ? saved.getUserAgent() : "n/a").append("\n");
            body.append("CreatedAt: ").append(saved.getCreatedAt()).append("\n\n");
            body.append("User JSON:\n").append(saved.getUserJson() != null ? saved.getUserJson() : "n/a").append("\n\n");

            // IMPORTANT: do NOT dump full metadata into email. Provide a short snippet or omit.
            String meta = saved.getMetadata();
            if (meta == null || meta.isEmpty()) {
                body.append("Metadata: n/a\n");
            } else {
                // small snippet only
                body.append("Metadata (snippet):\n");
                body.append(meta.length() > MAX_METADATA_EMAIL_SNIPPET ? meta.substring(0, MAX_METADATA_EMAIL_SNIPPET) + "...[truncated]" : meta);
                body.append("\n\n");
                body.append("Note: full diagnostics are stored in the DB (LONGTEXT). To view full metadata, use admin tools.\n");
            }

            msg.setText(body.toString());

            mailSender.ifPresent(m -> {
                try {
                    m.send(msg);
                    log.info("Sent support notification email for report id={}", saved.getId());
                } catch (MailException me) {
                    log.warn("Failed to send support notification email for report id={}: {}", saved.getId(), me.getMessage());
                }
            });
        } catch (Exception e) {
            log.warn("Unexpected error while composing/sending support email for id={}: {}", saved.getId(), e.getMessage());
        }
    }

    private String safeTrim(String s, int maxLen, String fallback) {
        if (s == null) return fallback;
        String t = s.trim();
        return t.length() <= maxLen ? t : t.substring(0, maxLen);
    }
}
