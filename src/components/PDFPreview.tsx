import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Users, Palette, Calendar, Download } from 'lucide-react';

interface PDFPreviewProps {
  className?: string;
}

export function PDFPreview({ className }: PDFPreviewProps) {
  const adminFeatures = [
    {
      title: 'All Registrations Report',
      description: 'Complete list of all student registrations across all years',
      icon: Users,
      badge: 'Admin Only',
      features: ['Student details', 'Event information', 'Registration status', 'Event dates', 'Summary statistics']
    },
    {
      title: 'Year-wise Reports',
      description: 'Filter registrations by specific academic year',
      icon: Calendar,
      badge: 'Admin Only',
      features: ['First/Second/Third/Fourth year filtering', 'Year-specific statistics', 'Department breakdown', 'Event participation by year']
    },
    {
      title: 'Event-wise Reports',
      description: 'Registrations organized by event/event',
      icon: Palette,
      badge: 'Admin Only',
      features: ['Grouped by event name', 'Participant lists per event', 'Event capacity analysis', 'Game vs Athletic breakdown']
    }
  ];

  const coordinatorFeatures = [
    {
      title: 'My Students\' Registrations',
      description: 'Download registrations for your year students only',
      icon: Users,
      badge: 'Coordinator',
      features: ['Own year students only', 'All events they\'re registered for', 'Registration status tracking', 'Personal activity report']
    }
  ];

  const pdfFeatures = [
    'Professional PDF formatting with headers and footers',
    'Automatic table generation with proper styling',
    'Summary statistics and breakdowns',
    'Date and time stamps',
    'Branded design with school colors',
    'Responsive table layouts',
    'Multi-page support with page numbering',
    'Export with descriptive filenames'
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            PDF Download Features
          </CardTitle>
          <CardDescription>
            Comprehensive reporting system for admins and coordinators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...adminFeatures, ...coordinatorFeatures].map((feature, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <feature.icon className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                    <Badge variant={feature.badge === 'Admin Only' ? 'default' : 'secondary'}>
                      {feature.badge}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {feature.features.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="w-1 h-1 bg-primary rounded-full mt-2 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-secondary" />
            PDF Generation Features
          </CardTitle>
          <CardDescription>
            Professional document generation with advanced formatting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {pdfFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-secondary rounded-full mt-2 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">For Administrators:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Access PDF downloads from Dashboard, Events, or Registrations pages</li>
              <li>Choose from dropdown: All Registrations, Year-wise, or Event-wise reports</li>
              <li>Select specific year filter if needed</li>
              <li>Click download to generate and save PDF automatically</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">For Year Coordinators:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground ml-4">
              <li>Find PDF download options in Dashboard or Registrations pages</li>
              <li>Click "Download My Students' Registrations"</li>
              <li>PDF includes only your year students' registration details</li>
              <li>Report automatically filtered to your coordinator permissions</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
