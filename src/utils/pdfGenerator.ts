import { jsPDF } from 'jspdf';
import { SaaSWedding } from '../types';

/**
 * Automatically generates a branded client onboarding & credentials PDF
 * and downloads it immediately in the user's browser.
 */
export const generateCredentialsPDF = (wedding: SaaSWedding, baseUrl: string) => {
  // Create instance of A4 PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // 1. Decorative Page Border (Elegant Gold/Amber frame)
  doc.setDrawColor(217, 119, 6); // Amber-600
  doc.setLineWidth(0.75);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  doc.setDrawColor(31, 41, 55); // Gray-800 thin inner frame
  doc.setLineWidth(0.2);
  doc.rect(9.5, 9.5, pageWidth - 19, pageHeight - 19);

  // 2. Header Banner (Dark Charcoal)
  doc.setFillColor(28, 25, 23); // Stone-900
  doc.rect(margin, margin, contentWidth, 32, 'F');

  // Decorative Accent line at bottom of banner
  doc.setFillColor(217, 119, 6); // Amber gold line
  doc.rect(margin, margin + 32, contentWidth, 2, 'F');

  // Header Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('TECTELL', margin + 8, margin + 12);

  doc.setTextColor(245, 158, 11); // Amber-500
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.text('WEDDING SOFTWARE CLIENT PORTAL', margin + 8, margin + 19);

  doc.setTextColor(209, 213, 219); // Gray-300
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('Confidential Client Credentials & Onboarding Sheet', margin + 8, margin + 25);

  // Document Info Block (Right-aligned in header)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DOC ID:', pageWidth - margin - 55, margin + 11);
  doc.text('ISSUED:', pageWidth - margin - 55, margin + 16);
  doc.text('STATUS:', pageWidth - margin - 55, margin + 21);
  doc.text('TIER:', pageWidth - margin - 55, margin + 26);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(229, 231, 235);
  doc.text(`TEC-${wedding.id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`, pageWidth - margin - 40, margin + 11);
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), pageWidth - margin - 40, margin + 16);
  
  // Highlight active status in green/white
  doc.setTextColor(52, 211, 153); // Emerald-400
  doc.setFont('helvetica', 'bold');
  doc.text('PROVISIONED & ACTIVE', pageWidth - margin - 40, margin + 21);

  doc.setTextColor(245, 158, 11); // Amber-500
  doc.text(`${(wedding.colorTheme || 'emerald').toUpperCase()} EDITION`, pageWidth - margin - 40, margin + 26);


  // 3. Section I: Workspace Overview
  let currentY = margin + 46;
  
  doc.setFillColor(244, 244, 245); // Gray-100 banner for section header
  doc.rect(margin, currentY, contentWidth, 8, 'F');
  
  doc.setTextColor(28, 25, 23); // Stone-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1. WEDDING WORKSPACE METADATA', margin + 4, currentY + 5.5);

  currentY += 14;

  // Metadata Fields
  const metadata = [
    { label: 'Couple Profile:', val: wedding.title },
    { label: 'Venue / Resort:', val: wedding.resortName },
    { label: 'Owner / Contact:', val: wedding.ownerName || 'Prestige Client' },
    { label: 'Theme Variant:', val: wedding.colorTheme ? wedding.colorTheme.charAt(0).toUpperCase() + wedding.colorTheme.slice(1) : 'Emerald' },
    { label: 'Licensing Period:', val: `${wedding.activeMonths || 12} Months Active Plan` },
    { label: 'Expiration Date:', val: wedding.expiresAt ? new Date(wedding.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' },
  ];

  metadata.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const posX = margin + (col * (contentWidth / 2)) + 4;
    const posY = currentY + (row * 10);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(115, 115, 115); // Gray-500
    doc.setFontSize(9);
    doc.text(item.label, posX, posY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(38, 38, 38); // Gray-800
    doc.setFontSize(10);
    doc.text(item.val, posX + 34, posY);
  });

  currentY += 34;


  // 4. Section II: Security Credentials Box (Gold Border Box)
  doc.setFillColor(254, 252, 243); // Creamy warm white
  doc.setDrawColor(245, 158, 11); // Amber border
  doc.setLineWidth(0.4);
  doc.rect(margin, currentY, contentWidth, 62, 'FD');

  // Badge header inside credentials card
  doc.setFillColor(245, 158, 11);
  doc.rect(margin, currentY, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. SECURE PORTAL ACCESS & LOGIN CREDENTIALS', margin + 4, currentY + 5);

  const cleanPortalUrl = `${baseUrl}/${wedding.id}`;

  // Content of Credentials
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(10);

  // Workspace ID - Highlighted and prominent as requested
  doc.setFont('helvetica', 'bold');
  doc.text('WEDDING WORKSPACE ID:', margin + 8, currentY + 15);
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(180, 83, 9); // Amber-700
  doc.text(wedding.id, margin + 58, currentY + 15);

  // URL
  doc.setFontSize(10);
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.text('DIRECT WORKSPACE URL:', margin + 8, currentY + 24);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text(cleanPortalUrl, margin + 58, currentY + 24);

  // Login Email
  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'bold');
  doc.text('ADMINISTRATOR EMAIL:', margin + 8, currentY + 33);
  doc.setFont('helvetica', 'normal');
  doc.text(wedding.adminEmail, margin + 58, currentY + 33);

  // Password (Monospaced style using Courier)
  doc.setFont('helvetica', 'bold');
  doc.text('TEMPORARY PASSWORD:', margin + 8, currentY + 42);
  doc.setFont('courier', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38); // Red-600 password
  doc.text(wedding.adminPassword, margin + 58, currentY + 42);

  // Security warning banner
  doc.setFillColor(254, 242, 242); // Light red fill
  doc.setDrawColor(252, 165, 165); // Red outline
  doc.setLineWidth(0.25);
  doc.rect(margin + 4, currentY + 48, contentWidth - 8, 10, 'FD');

  doc.setTextColor(185, 28, 28); // Red-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('IMPORTANT SECURITY ADVISEMENT:', margin + 8, currentY + 54);
  doc.setFont('helvetica', 'normal');
  doc.text('Do not share this onboarding sheet. It grants supervisor control over your wedding database.', margin + 61, currentY + 54);

  currentY += 74;


  // 5. Section III: Client Portal Guide
  doc.setFillColor(244, 244, 245);
  doc.rect(margin, currentY, contentWidth, 8, 'F');
  doc.setTextColor(28, 25, 23);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('3. ADMINISTRATOR QUICK-START DIRECTIONS', margin + 4, currentY + 5.5);

  currentY += 14;

  const steps = [
    { num: '01', title: 'LAUNCH YOUR WEBSITE', desc: 'Type your Wedding Workspace ID on the Tectell homepage to load your site, or click the Direct Link above to visit it instantly. Share this link with guests so they can RSVP!' },
    { num: '02', title: 'HOST LOGIN (ADMIN ACCESS)', desc: 'Once on your wedding website, click the "Host Login" button in the corner. Enter your admin email and temporary password (listed in Section 2) to log in securely.' },
    { num: '03', title: 'MANAGE RSVPS & SUITES', desc: 'Approved guests automatically populate your dashboard. Assign guests to hotel/resort rooms easily, send announcements, and coordinate group transfers.' },
    { num: '04', title: 'SCHEDULES, BUDGETS & TASKS', desc: 'Create your multi-day event timeline, record coordinator to-dos, track budget estimates, and input live expenses. Everything saves instantly in the cloud!' },
  ];

  steps.forEach((step, idx) => {
    const posY = currentY + (idx * 16);

    // Number circle representation
    doc.setFillColor(28, 25, 23); // Stone-900
    doc.rect(margin + 4, posY, 8, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(step.num, margin + 6, posY + 5.5);

    // Text details
    doc.setTextColor(28, 25, 23);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(step.title, margin + 16, posY + 3);

    doc.setTextColor(100, 116, 139); // Slate-500
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    // Split text automatically to handle layout wrapping
    const splitDesc = doc.splitTextToSize(step.desc, contentWidth - 24);
    doc.text(splitDesc, margin + 16, posY + 7);
  });

  // 6. Signature / Signoff block
  const signY = pageHeight - margin - 22;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(margin, signY, pageWidth - margin, signY);

  // Left Column Sign-off
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.setFontSize(7.5);
  doc.text('SYSTEM ONBOARDING AUTHORIZATION', margin + 4, signY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(75, 85, 99);
  doc.text('TECTELL AUTOMATED PROVISIONER V4.1', margin + 4, signY + 11);
  doc.setFont('helvetica', 'normal');
  doc.text('Digital Signature Verified on Deployment', margin + 4, signY + 15);

  // Right Column branding
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 83, 9); // Amber-700
  doc.setFontSize(9);
  doc.text('THANK YOU FOR PARTNERING WITH TECTELL', pageWidth - margin - 82, signY + 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.setFontSize(7.5);
  doc.text('Everything needed for building your dream wedding in one cohesive engine.', pageWidth - margin - 82, signY + 12);

  // Save / Trigger Download
  const fileName = `Tectell_Credentials_${wedding.id}.pdf`;
  doc.save(fileName);
};
