package com.redbus.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@Entity
@Table(name = "support_reports")
public class SupportReport {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 255)
	private String subject;

	@Lob
	@Column(nullable = false)
	private String description;

	@Lob
	@Column(name = "metadata", columnDefinition = "LONGTEXT")
	private String metadata;

	@Column(length = 2048)
	private String url;

	@Column(length = 1024)
	private String userAgent;

	@Lob
	@Column(nullable = true)
	private String userJson;

	@Column(nullable = false)
	private OffsetDateTime createdAt;

	public SupportReport() {
	}

}
