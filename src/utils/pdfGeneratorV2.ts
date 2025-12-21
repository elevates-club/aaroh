import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

export interface StudentRegistrationData {
  id: string;
  student_name: string;
  roll_number: string;
  department: string;
  year: string;
  event_name: string;
  category: string;
  // event_type removed as it correlates to category
  venue?: string;
  event_date?: string;
  registration_date: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface PDFOptions {
  title: string;
  subtitle?: string;
  filename: string;
  includeHeader?: boolean;
  includeFooter?: boolean;
}

export class PDFGeneratorV2 {
  private doc: jsPDF;

  constructor() {
    this.doc = new jsPDF();
  }

  private addHeader(title: string, subtitle?: string) {
    const pageWidth = this.doc.internal.pageSize.width;

    // Add logo/title area
    this.doc.setFillColor(59, 130, 246); // Primary blue
    this.doc.rect(0, 0, pageWidth, 25, 'F');

    // Title
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, 14, 16);

    // Subtitle
    if (subtitle) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, 14, 22);
    }

    // Generated date
    this.doc.setFontSize(8);
    this.doc.text(`Generated: ${format(new Date(), 'PPp')}`, pageWidth - 14, 16, { align: 'right' });

    // Reset text color
    this.doc.setTextColor(0, 0, 0);
  }

  private addFooter() {
    const pageHeight = this.doc.internal.pageSize.height;
    const pageWidth = this.doc.internal.pageSize.width;

    this.doc.setFontSize(8);
    this.doc.setTextColor(128, 128, 128);
    this.doc.text('Events Management System', 14, pageHeight - 10);
    this.doc.text(`Page ${this.doc.getCurrentPageInfo().pageNumber}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
  }

  private createTableHTML(data: StudentRegistrationData[]): string {
    const tableRows = data.map(item => `
      <tr style="color: black;">
        <td style="border: 1px solid #ddd; padding: 8px; color: black;">${item.student_name}</td>
        <td style="border: 1px solid #ddd; padding: 8px; color: black;">${item.roll_number}</td>
        <td style="border: 1px solid #ddd; padding: 8px; color: black;">${item.department}</td>
        <td style="border: 1px solid #ddd; padding: 8px; color: black;">${item.year.charAt(0).toUpperCase() + item.year.slice(1)}</td>
        <td style="border: 1px solid #ddd; padding: 8px; color: black;">${item.event_name}</td>
        <td style="border: 1px solid #ddd; padding: 8px; color: black;">${item.category ? item.category.replace('_', ' ').toUpperCase() : 'N/A'}</td>
      </tr>
    `).join('');

    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: black; background-color: white;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: black;">
          <thead>
            <tr style="background-color: #3b82f6; color: white;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; color: white;">Student Name</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; color: white;">Roll Number</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; color: white;">Department</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; color: white;">Year</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; color: white;">Event</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; color: white;">Category</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
  }

  private createSummaryHTML(data: StudentRegistrationData[]): string {
    const summary = this.generateSummary(data);
    const summaryItems = Object.entries(summary).map(([key, value]) =>
      `<div style="margin: 5px 0;"><strong>${key}:</strong> ${value}</div>`
    ).join('');

    return `
      <div style="font-family: Arial, sans-serif; padding: 20px; margin-top: 20px; color: black; background-color: white;">
        <h3 style="color: #3b82f6; margin-bottom: 10px;">Summary</h3>
        <div style="color: black;">${summaryItems}</div>
      </div>
    `;
  }

  private generateSummary(data: StudentRegistrationData[]) {
    const summary: Record<string, number | string> = {
      'Total Registrations': data.length,
      'On-Stage': data.filter(d => d.category === 'on_stage').length,
      'Off-Stage': data.filter(d => d.category === 'off_stage').length,
      'Approved': data.filter(d => d.status === 'approved').length,
      'Pending': data.filter(d => d.status === 'pending').length,
    };

    // Year breakdown
    const yearCounts = data.reduce((acc, item) => {
      const year = item.year.charAt(0).toUpperCase() + item.year.slice(1);
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(yearCounts).forEach(([year, count]) => {
      summary[`${year} Year Students`] = count;
    });

    return summary;
  }

  public async generateStudentRegistrationsPDF(
    data: StudentRegistrationData[],
    options: PDFOptions
  ): Promise<void> {
    try {
      // Create a temporary container for the HTML content
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '800px';
      container.style.backgroundColor = 'white';
      container.style.color = 'black';

      // Add header HTML
      const headerHTML = options.includeHeader !== false ? `
        <div style="background-color: #3b82f6; color: white; padding: 15px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 18px;">${options.title}</h1>
          ${options.subtitle ? `<p style="margin: 5px 0 0 0; font-size: 12px;">${options.subtitle}</p>` : ''}
          <p style="margin: 5px 0 0 0; font-size: 10px; text-align: right;">Generated: ${format(new Date(), 'PPp')}</p>
        </div>
      ` : '';

      // Create the complete HTML content
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: black; background-color: white;">
          ${headerHTML}
          ${this.createTableHTML(data)}
          ${this.createSummaryHTML(data)}
        </div>
      `;

      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Convert HTML to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: container.scrollHeight
      });

      // Remove the temporary container
      document.body.removeChild(container);

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add first page
      this.doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        this.doc.addPage();
        this.doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      this.doc.save(options.filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  public async generateEventWiseRegistrationsPDF(
    data: Record<string, StudentRegistrationData[]>,
    options: PDFOptions
  ): Promise<void> {
    try {
      // Create a temporary container for the HTML content
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '800px';
      container.style.backgroundColor = 'white';
      container.style.color = 'black';

      // Add header HTML
      const headerHTML = options.includeHeader !== false ? `
        <div style="background-color: #3b82f6; color: white; padding: 15px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 18px;">${options.title}</h1>
          ${options.subtitle ? `<p style="margin: 5px 0 0 0; font-size: 12px;">${options.subtitle}</p>` : ''}
          <p style="margin: 5px 0 0 0; font-size: 10px; text-align: right;">Generated: ${format(new Date(), 'PPp')}</p>
        </div>
      ` : '';

      // Create event-wise content
      let eventContent = '';
      Object.entries(data).forEach(([eventName, registrations]) => {
        const tableRows = registrations.map(item => `
          <tr style="color: black;">
            <td style="border: 1px solid #ddd; padding: 8px; color: black;">${item.student_name}</td>
            <td style="border: 1px solid #ddd; padding: 8px; color: black;">${item.roll_number}</td>
            <td style="border: 1px solid #ddd; padding: 8px; color: black;">${item.department}</td>
            <td style="border: 1px solid #ddd; padding: 8px; color: black;">${item.year.charAt(0).toUpperCase() + item.year.slice(1)}</td>
          </tr>
        `).join('');

        eventContent += `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #3b82f6; margin-bottom: 10px;">${eventName} (${registrations.length} students)</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: black;">
              <thead>
                <tr style="background-color: #3b82f6; color: white;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left; color: white;">Student Name</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left; color: white;">Roll Number</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left; color: white;">Department</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: left; color: white;">Year</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        `;
      });

      // Create the complete HTML content
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: black; background-color: white;">
          ${headerHTML}
          ${eventContent}
        </div>
      `;

      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      // Convert HTML to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: container.scrollHeight
      });

      // Remove the temporary container
      document.body.removeChild(container);

      // Create PDF from canvas
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add first page
      this.doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        this.doc.addPage();
        this.doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save the PDF
      this.doc.save(options.filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
}

// Utility functions for different user roles
export const generateAdminAllRegistrationsPDF = async (
  registrations: StudentRegistrationData[]
): Promise<void> => {
  const generator = new PDFGeneratorV2();

  await generator.generateStudentRegistrationsPDF(registrations, {
    title: 'All Student Registrations',
    subtitle: 'Complete list of all events registrations',
    filename: `all-registrations-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
  });
};

export const generateAdminYearWiseRegistrationsPDF = async (
  registrations: StudentRegistrationData[],
  year: string
): Promise<void> => {
  const generator = new PDFGeneratorV2();

  await generator.generateStudentRegistrationsPDF(registrations, {
    title: `${year.charAt(0).toUpperCase() + year.slice(1)} Year Student Registrations`,
    subtitle: `Events registrations for ${year} year students`,
    filename: `${year}-year-registrations-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
  });
};

export const generateCoordinatorRegistrationsPDF = async (
  registrations: StudentRegistrationData[],
  coordinatorYear: string
): Promise<void> => {
  const generator = new PDFGeneratorV2();

  await generator.generateStudentRegistrationsPDF(registrations, {
    title: `My Students' Events Registrations`,
    subtitle: `${coordinatorYear.charAt(0).toUpperCase() + coordinatorYear.slice(1)} year coordinator report`,
    filename: `my-students-registrations-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
  });
};

export const generateEventWiseRegistrationsPDF = async (
  registrationsByEvent: Record<string, StudentRegistrationData[]>,
  title: string,
  filename: string
): Promise<void> => {
  const generator = new PDFGeneratorV2();

  await generator.generateEventWiseRegistrationsPDF(registrationsByEvent, {
    title,
    subtitle: 'Registrations organized by event/event',
    filename: `${filename}-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
  });
};

export const generateEventParticipantsPDF = async (
  event: { id: string; name: string; category: string; venue: string; event_date?: string | null },
  userRole?: string
): Promise<void> => {
  const { supabase } = await import('@/integrations/supabase/client');

  try {
    // Build the query based on user role
    let query = supabase
      .from('registrations')
      .select(`
        id,
        status,
        created_at,
        student:students!inner(
          id,
          name,
          roll_number,
          department,
          year
        )
      `)
      .eq('event_id', event.id)
      .eq('status', 'approved'); // Only show approved registrations

    // If not admin or event manager, filter by coordinator's year
    if (userRole && userRole !== 'admin' && userRole !== 'event_manager') {
      const year = userRole.replace('_coordinator', '').replace('_year', '') as 'first' | 'second' | 'third' | 'fourth';
      query = query.eq('student.year', year);
    }

    const { data: registrations, error } = await query;

    if (error) {
      throw error;
    }

    // Transform data to match the expected format
    const registrationData: StudentRegistrationData[] = (registrations || []).map(reg => ({
      id: reg.id,
      student_name: reg.student.name,
      roll_number: reg.student.roll_number,
      department: reg.student.department,
      year: reg.student.year,
      event_name: event.name,
      category: event.category,
      venue: event.venue,
      event_date: event.event_date || undefined,
      registration_date: reg.created_at,
      status: reg.status as 'pending' | 'approved' | 'rejected'
    }));

    const generator = new PDFGeneratorV2();

    const title = `${event.name} - Participants List`;
    const subtitle = (userRole === 'admin' || userRole === 'event_manager')
      ? 'All registered participants'
      : `${userRole?.replace('_coordinator', '').replace('_year', '')} year participants only`;

    await generator.generateStudentRegistrationsPDF(registrationData, {
      title,
      subtitle,
      filename: `${event.name.replace(/[^a-zA-Z0-9]/g, '-')}-participants-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
    });

  } catch (error) {
    console.error('Error generating event participants PDF:', error);
    throw error;
  }
};
