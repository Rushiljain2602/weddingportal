# 💍 Enterprise Wedding Management Portal | TecTell

> **An advanced, end-to-end full-stack ecosystem built by TecTell to completely eliminate the logistical chaos of modern, large-scale Indian weddings—orchestrating guest intelligence, automated WhatsApp communications, dynamic room/transport logistics, and real-time financial tracking in a single pane of glass.**

---

## 🎯 1. Chosen Vertical
* **Vertical:** **EventTech & PropTech / Gov & Enterprise Hospitality Logistics** (Large-scale event operations and guest experience management).
* **Problem Statement:** Planning a major wedding is notoriously fragmented. Planners and families struggle daily with messy spreadsheets, lost WhatsApp chats, manual phone call RSVPs, chaotic hotel room allotments, and unmanaged vendor budgets. This widespread operational friction leads to miscommunication, double bookings, and severe stress.

---

## 🧠 2. Approach and Logic
Our architectural and product design approach focused on **centralized orchestration and decentralized guest interaction**:
* **The Logic:** We split the system into two distinct workflows:
  1. **The Admin Command Center:** A high-privilege interface for event planners and hosts to manage master guest data, room blocks, fleet schedules, tasks, and budgets.
  2. **The Guest-Facing Portal:** A lightweight, secure, mobile-optimized public web interface where individual guests interact only with the data relevant to them (their schedule, RSVP status, and hotel details).
* **Tech-Driven Efficiency:** By integrating direct communication channels (Meta WhatsApp API) with relational database matrices (room allocation logic), we eliminated manual data re-entry and human error.

---

## ⚙️ 3. How the Solution Works
The platform operates as an integrated end-to-end workflow:
1. **Onboarding & Guest Setup:** Organizers input master guest lists and categorize attendees into relation groups and event tiers.
2. **Automated Outreach:** Organizers dispatch customized digital invites and updates in bulk via the integrated **Meta WhatsApp Cloud API**.
3. **Interactive Guest Engagement:** Guests open their personalized web link to view itineraries, dress codes, and submit multi-day RSVPs and dietary choices.
4. **Logistics & Allocation:** The system automatically maps families to hotel room blocks and transport fleets based on capacity rules.
5. **Execution & Monitoring:** Event coordinators manage daily tasks on an agile board while tracking real-time financial expenditures against target budgets, culminating in comprehensive full-stack post-event reports.

---

## ⚠️ 4. Assumptions Made
During the rapid development of this platform, the following operational and technical assumptions were made:
* **Digital Literacy:** It is assumed that primary guests have smartphone access to view web-based digital invitations and interact with the RSVP portal.
* **Connectivity:** Organizers and venue coordinators operate with stable internet connectivity to sync real-time room allocations and budget ledger updates.

---

## ✨ Core Feature Modules

* **👥 Event & Guest Management:** Centralized master database for profiles, family grouping, and tier segmentation.
* **📩 Advanced RSVP Engine:** Granular tracking across multi-day ceremonies with dietary logs.
* **🌐 Guest-Facing Frontend Portal:** Mobile-responsive web experience for custom itineraries and event access.
* **🏨 Smart Room Allocation Matrix:** Automated lodging manager mapping guest families to hotel blocks.
* **🚐 Transport & Logistics Management:** Fleet coordination for arrivals, departures, and shuttles.
* **💬 Bulk WhatsApp Integration (Meta Cloud API):** Automated messaging for invites, reminders, and updates.
* **💰 Budget Management System:** Real-time financial ledger monitoring vendor expenses against targets.
* **📋 Internal Task Manager:** Agile task board for event coordinators to track operational to-dos.
* **📊 Full-Stack Reports:** Aggregated analytics covering headcounts, room fill-rates, and financial expenditures.

---

## 🛠️ Technology Stack
* **Architecture:** Full-Stack Modern Web Application
* **Frontend:** Responsive UI components optimized for mobile and desktop
* **Communication Layer:** Meta WhatsApp Cloud API for automated messaging
* **Deployment:** High-performance production hosting

---

## ⚙️ Local Setup & Installation

If you want to run or inspect the project locally:

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/Rushiljain2602/weddingportal.git](https://github.com/Rushiljain2602/weddingportal.git)
   cd weddingportal
