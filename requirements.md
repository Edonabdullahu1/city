# Requirements Document

## Introduction

This document outlines the requirements for a comprehensive travel agency web application designed for tour operators to sell city break packages. The application will be a multi-page web application built with Node.js/Next.js and PostgreSQL, featuring responsive design with separate mobile and desktop implementations. The system will manage flight bookings (both guaranteed block seats and dynamic API-based flights), hotel reservations, transfers, and excursions, while providing different access levels for users, agents, and administrators.

## Requirements

### Requirement 1: User Authentication and Authorization

**User Story:** As a system user, I want to have role-based access to different features, so that I can perform actions appropriate to my role level.

#### Acceptance Criteria

1. WHEN a user registers THEN the system SHALL create an account with "user" role by default
2. WHEN an admin creates agent accounts THEN the system SHALL support three user levels: user, agent, and admin
3. WHEN a user logs in THEN the system SHALL authenticate credentials and redirect to appropriate dashboard
4. WHEN accessing protected features THEN the system SHALL verify user permissions based on role
5. WHEN promoting users to agents THEN only admins SHALL have permission to create agent accounts

### Requirement 2: Flight Management System

**User Story:** As a travel agent, I want to manage both guaranteed block seats and dynamic flight options, so that I can offer comprehensive flight booking services.

#### Acceptance Criteria

1. WHEN creating guaranteed flights THEN the system SHALL allow input of departure/arrival cities, flight numbers, dates, times, and seat capacity for pre-purchased block seats
2. WHEN searching dynamic flights THEN the system SHALL integrate with Google Flights API via SerpAPI to display real-time pricing for package comparison
3. WHEN a guaranteed flight booking is made THEN the system SHALL automatically reduce available seat count from the block allocation
4. WHEN generating flight tickets THEN the system SHALL create printable vouchers with all flight details for confirmed bookings

### Requirement 3: Hotel Management System

**User Story:** As a travel agent, I want to manage hotel inventory and bookings, so that I can offer accommodation as part of city break packages.

#### Acceptance Criteria

1. WHEN adding hotels THEN the system SHALL store city, description, image gallery, and pricing per standard room per night
2. WHEN configuring rooms THEN the system SHALL support standard rooms that can accommodate single, double, or triple occupancy
3. WHEN managing children THEN the system SHALL handle children information separately with hotel-specific policies
4. WHEN setting availability THEN the system SHALL support blackout dates when hotels are unavailable
5. WHEN booking hotels THEN the system SHALL check availability against blackout dates
6. WHEN generating hotel vouchers THEN the system SHALL create printable documents with booking details

### Requirement 4: Transfer and Excursion Services

**User Story:** As a travel agent, I want to offer additional services like transfers and excursions, so that I can provide complete travel packages.

#### Acceptance Criteria

1. WHEN managing transfers THEN the system SHALL store both airport-to-hotel and hotel-to-airport transfer options with per-person pricing
2. WHEN managing excursions THEN the system SHALL store name, activities, information, and per-person pricing
3. WHEN booking additional services THEN the system SHALL calculate total package pricing including all selected extras
4. WHEN generating service vouchers THEN the system SHALL create separate documents for transfers and excursions

### Requirement 5: Package Creation and Soft Booking System

**User Story:** As a customer, I want to view and soft-book complete city break packages, so that I can reserve my preferred travel options before final confirmation.

#### Acceptance Criteria

1. WHEN creating packages THEN the system SHALL combine flights, hotels, and optional services into single bookings
2. WHEN calculating pricing THEN the system SHALL display itemized costs for all package components
3. WHEN customers want to book THEN the system SHALL provide soft booking functionality via reservation form
4. WHEN soft booking is submitted THEN the system SHALL hold the reservation for 3 hours and notify sales agents
5. WHEN soft booking expires THEN the system SHALL automatically release held inventory after 3 hours
6. WHEN agents confirm bookings THEN the system SHALL generate all necessary vouchers and tickets

### Requirement 6: Document Generation and Communication

**User Story:** As a customer, I want to receive all necessary travel documents and confirmations, so that I have everything needed for my trip.

#### Acceptance Criteria

1. WHEN booking is confirmed THEN the system SHALL generate flight tickets, hotel vouchers, transfer vouchers, and excursion vouchers
2. WHEN documents are ready THEN the system SHALL send email with all booking information and attachments
3. WHEN calendar integration is requested THEN the system SHALL create phone calendar events for flights, transfers, and excursions
4. WHEN accessing customer panel THEN users SHALL view all their bookings and download documents

### Requirement 7: Role-Based Dashboard System

**User Story:** As a system user, I want access to dashboard features appropriate to my role, so that I can efficiently manage my responsibilities.

#### Acceptance Criteria

1. WHEN admins access dashboard THEN the system SHALL display all bookings, comprehensive statistics, and full system management tools
2. WHEN agents access dashboard THEN the system SHALL show only their assigned bookings, remaining seats for destinations, and relevant statistics
3. WHEN managing bookings THEN agents SHALL be able to transfer bookings to other agents
4. WHEN viewing analytics THEN dashboards SHALL display prices, offers sent, booking statistics, and predictions
5. WHEN generating reports THEN the system SHALL provide sales data, seat availability, and performance metrics

### Requirement 8: Responsive Design Architecture

**User Story:** As a user on any device, I want the application to work seamlessly on both desktop and mobile, so that I can access services from anywhere.

#### Acceptance Criteria

1. WHEN implementing responsive design THEN the system SHALL maintain separate file structures for desktop and mobile versions
2. WHEN accessing from mobile devices THEN the system SHALL serve optimized mobile-specific layouts
3. WHEN accessing from desktop THEN the system SHALL serve full-featured desktop layouts
4. WHEN switching between devices THEN user sessions SHALL remain consistent across platforms

### Requirement 9: Payment Processing

**User Story:** As a travel agency, I want to handle payments through offline wire transfers, so that I can maintain control over financial transactions.

#### Acceptance Criteria

1. WHEN processing payments THEN the system SHALL support offline wire transfer payment method only
2. WHEN booking is confirmed THEN the system SHALL provide wire transfer instructions to customers
3. WHEN payment is received THEN agents SHALL manually update booking status to "paid"
4. WHEN generating invoices THEN the system SHALL include wire transfer payment details

### Requirement 10: Booking Management and Modifications

**User Story:** As an agent, I want to manage customer bookings and modifications, so that I can provide flexible customer service.

#### Acceptance Criteria

1. WHEN customers need changes THEN they SHALL contact agents directly (no self-service modifications)
2. WHEN agents modify bookings THEN the system SHALL allow changes to hotels, names, dates, and cancellations
3. WHEN bookings are modified THEN the system SHALL update all related vouchers and documents
4. WHEN cancellations occur THEN agents SHALL process cancellations and update seat availability accordingly

### Requirement 11: Multi-language Support

**User Story:** As an international customer, I want to use the application in my preferred language, so that I can understand all information clearly.

#### Acceptance Criteria

1. WHEN accessing the application THEN users SHALL be able to select from English, Albanian, and Macedonian languages
2. WHEN switching languages THEN all interface elements, content, and documents SHALL be translated
3. WHEN generating vouchers THEN documents SHALL be created in the user's selected language
4. WHEN sending emails THEN communications SHALL use the customer's preferred language

### Requirement 12: Email Template Management

**User Story:** As an administrator, I want to manage customizable email templates, so that I can maintain consistent and professional communications.

#### Acceptance Criteria

1. WHEN setting up communications THEN the system SHALL provide customizable email templates for different scenarios
2. WHEN sending confirmations THEN the system SHALL use appropriate templates for booking confirmations, modifications, and cancellations
3. WHEN managing templates THEN admins SHALL be able to edit email content and formatting for each language
4. WHEN sending automated emails THEN the system SHALL populate templates with booking-specific information

### Requirement 13: WhatsApp Communication Integration

**User Story:** As a travel agency, I want to send WhatsApp messages to customers for important notifications and upselling opportunities, so that I can provide timely communication and increase sales.

#### Acceptance Criteria

1. WHEN flight departure approaches THEN the system SHALL send WhatsApp reminders to customers via n8n workflow automation
2. WHEN documents are ready THEN the system SHALL notify customers via WhatsApp that documents have been sent using n8n integration
3. WHEN upselling opportunities arise THEN agents SHALL be able to trigger WhatsApp messages about excursions and additional services through n8n
4. WHEN managing communications THEN the system SHALL integrate with n8n to process and track WhatsApp message delivery status

### Requirement 14: Technical Architecture

**User Story:** As a developer, I want the system built with modern technologies and best practices, so that it's maintainable and scalable.

#### Acceptance Criteria

1. WHEN building the application THEN the system SHALL use Node.js/Next.js framework
2. WHEN storing data THEN the system SHALL use PostgreSQL database
3. WHEN implementing features THEN the system SHALL follow multi-page application architecture (not SPA)
4. WHEN deploying THEN the system SHALL support modern web standards and performance optimization