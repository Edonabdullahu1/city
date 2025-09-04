'use client';

import React, { useState, useEffect } from 'react';
import { FiEdit2, FiSave, FiEye, FiMail, FiGlobe, FiCode } from 'react-icons/fi';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'confirmation' | 'reminder' | 'cancellation' | 'modification' | 'welcome' | 'reset';
  language: 'en' | 'sq' | 'mk';
  variables: string[];
  active: boolean;
}

const templateTypes = [
  { value: 'confirmation', label: 'Booking Confirmation' },
  { value: 'reminder', label: 'Payment Reminder' },
  { value: 'cancellation', label: 'Booking Cancellation' },
  { value: 'modification', label: 'Booking Modification' },
  { value: 'welcome', label: 'Welcome Email' },
  { value: 'reset', label: 'Password Reset' }
];

const languages = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'sq', label: 'Albanian', flag: '🇦🇱' },
  { value: 'mk', label: 'Macedonian', flag: '🇲🇰' }
];

const availableVariables = [
  '{{customerName}}',
  '{{reservationCode}}',
  '{{checkInDate}}',
  '{{checkOutDate}}',
  '{{totalAmount}}',
  '{{destination}}',
  '{{hotelName}}',
  '{{flightNumber}}',
  '{{paymentDueDate}}',
  '{{agentName}}',
  '{{companyName}}',
  '{{supportEmail}}',
  '{{supportPhone}}'
];

export default function EmailTemplateManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [editForm, setEditForm] = useState<Partial<EmailTemplate>>({});

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    // Mock data for demonstration
    const mockTemplates: EmailTemplate[] = [
      {
        id: '1',
        name: 'Booking Confirmation - English',
        subject: 'Your Booking {{reservationCode}} is Confirmed!',
        body: `Dear {{customerName}},

Thank you for booking with {{companyName}}!

Your reservation {{reservationCode}} has been confirmed.

**Booking Details:**
- Check-in: {{checkInDate}}
- Check-out: {{checkOutDate}}
- Destination: {{destination}}
- Hotel: {{hotelName}}
- Total Amount: {{totalAmount}}

**Next Steps:**
1. Complete your payment by {{paymentDueDate}}
2. Check your email for flight details
3. Download your travel documents

If you have any questions, please contact us at {{supportEmail}} or call {{supportPhone}}.

Best regards,
The {{companyName}} Team`,
        type: 'confirmation',
        language: 'en',
        variables: ['customerName', 'reservationCode', 'checkInDate', 'checkOutDate', 'destination', 'hotelName', 'totalAmount', 'paymentDueDate', 'companyName', 'supportEmail', 'supportPhone'],
        active: true
      },
      {
        id: '2',
        name: 'Payment Reminder - English',
        subject: 'Payment Reminder for {{reservationCode}}',
        body: `Dear {{customerName}},

This is a friendly reminder that payment for your booking {{reservationCode}} is due by {{paymentDueDate}}.

**Amount Due:** {{totalAmount}}

Please complete your payment to secure your reservation.

Thank you,
{{companyName}}`,
        type: 'reminder',
        language: 'en',
        variables: ['customerName', 'reservationCode', 'paymentDueDate', 'totalAmount', 'companyName'],
        active: true
      }
    ];
    setTemplates(mockTemplates);
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditForm(template);
    setIsEditing(true);
  };

  const handleSave = async () => {
    // Save template logic here
    console.log('Saving template:', editForm);
    setIsEditing(false);
    fetchTemplates();
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const renderPreview = (template: EmailTemplate) => {
    // Replace variables with sample data
    let preview = template.body;
    const sampleData: Record<string, string> = {
      customerName: 'John Doe',
      reservationCode: 'MXi-0001',
      checkInDate: 'March 15, 2024',
      checkOutDate: 'March 20, 2024',
      destination: 'Paris',
      hotelName: 'Grand Hotel Paris',
      totalAmount: '€1,250.00',
      paymentDueDate: 'March 10, 2024',
      companyName: 'Travel Agency',
      supportEmail: 'support@travelagency.com',
      supportPhone: '+1 234 567 8900',
      flightNumber: 'AA123',
      agentName: 'Jane Smith'
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return preview;
  };

  const filteredTemplates = templates.filter(template => {
    const typeMatch = selectedType === 'all' || template.type === selectedType;
    const langMatch = selectedLanguage === 'all' || template.language === selectedLanguage;
    return typeMatch && langMatch;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Email Template Manager</h2>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + New Template
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex gap-4">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Types</option>
            {templateTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">All Languages</option>
            {languages.map(lang => (
              <option key={lang.value} value={lang.value}>
                {lang.flag} {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTemplates.map(template => (
          <div key={template.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-semibold text-lg">{template.name}</h3>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {templateTypes.find(t => t.value === template.type)?.label}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                    {languages.find(l => l.value === template.language)?.flag} {template.language.toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    template.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {template.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePreview(template)}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                  title="Preview"
                >
                  <FiEye />
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit"
                >
                  <FiEdit2 />
                </button>
                <button
                  className="p-2 text-green-600 hover:bg-green-50 rounded"
                  title="Send Test"
                >
                  <FiMail />
                </button>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-1">Subject:</p>
              <p className="bg-gray-50 p-2 rounded mb-3">{template.subject}</p>
              
              <p className="font-medium mb-1">Variables Used:</p>
              <div className="flex flex-wrap gap-1">
                {template.variables.slice(0, 5).map(variable => (
                  <span key={variable} className="px-2 py-1 bg-gray-100 text-xs rounded">
                    {variable}
                  </span>
                ))}
                {template.variables.length > 5 && (
                  <span className="px-2 py-1 bg-gray-100 text-xs rounded">
                    +{template.variables.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {isEditing && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-semibold mb-4">Edit Template</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Template Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={editForm.type || ''}
                    onChange={(e) => setEditForm({...editForm, type: e.target.value as any})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {templateTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Language</label>
                  <select
                    value={editForm.language || ''}
                    onChange={(e) => setEditForm({...editForm, language: e.target.value as any})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {languages.map(lang => (
                      <option key={lang.value} value={lang.value}>
                        {lang.flag} {lang.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  value={editForm.subject || ''}
                  onChange={(e) => setEditForm({...editForm, subject: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Body</label>
                <textarea
                  value={editForm.body || ''}
                  onChange={(e) => setEditForm({...editForm, body: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                  rows={15}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Available Variables</label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                  {availableVariables.map(variable => (
                    <button
                      key={variable}
                      onClick={() => {
                        const textarea = document.querySelector('textarea');
                        if (textarea) {
                          const pos = textarea.selectionStart;
                          const newBody = editForm.body || '';
                          const updatedBody = newBody.slice(0, pos) + variable + newBody.slice(pos);
                          setEditForm({...editForm, body: updatedBody});
                        }
                      }}
                      className="px-2 py-1 bg-white border text-xs rounded hover:bg-blue-50"
                    >
                      {variable}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <FiSave /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-xl font-semibold mb-4">Email Preview</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-600 mb-1">Subject:</p>
              <p className="font-semibold">{selectedTemplate.subject.replace(/{{[^}]+}}/g, (match) => {
                const key = match.slice(2, -2);
                const sampleData: Record<string, string> = {
                  reservationCode: 'MXi-0001'
                };
                return sampleData[key] || match;
              })}</p>
            </div>
            
            <div className="bg-white border rounded-lg p-6">
              <pre className="whitespace-pre-wrap font-sans">
                {renderPreview(selectedTemplate)}
              </pre>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Send Test Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}