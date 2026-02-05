import { useState, useEffect } from 'react';
import API_ENDPOINTS from '../config/api';

function Home() {
  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedLeads, setExtractedLeads] = useState([]);
  const [savingLeads, setSavingLeads] = useState(false);
  const [sendingMessages, setSendingMessages] = useState(false);
  const [savingToSheets, setSavingToSheets] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  const [reachedLeads, setReachedLeads] = useState(0);
  const [greeting, setGreeting] = useState('');
  const [rateLimit, setRateLimit] = useState({
    maxLeads: 10,
    leadsSent: 0,
    availableLeads: 10,
    canSend: true,
    minutesRemaining: 0
  });

  useEffect(() => {
    fetchCategories();
    fetchTotalLeads();
    fetchAnalytics();
    fetchLastSearchResults();
    fetchGreeting();
    fetchRateLimitStatus();
    // Update greeting every minute
    const interval = setInterval(fetchGreeting, 60000);
    // Poll rate limit status every 30 seconds
    const rateLimitInterval = setInterval(fetchRateLimitStatus, 30000);
    return () => {
      clearInterval(interval);
      clearInterval(rateLimitInterval);
    };
  }, []);

  const fetchRateLimitStatus = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.RATE_LIMIT_STATUS);
      if (response.ok) {
        const data = await response.json();
        setRateLimit(data);
      }
    } catch (error) {
      console.error('Error fetching rate limit status:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIES);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTotalLeads = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.LEADS);
      if (response.ok) {
        const data = await response.json();
        setTotalLeads(data.length);
      }
    } catch (error) {
      console.error('Error fetching total leads:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ANALYTICS);
      if (response.ok) {
        const data = await response.json();
        setReachedLeads(data.reachedLeads || 0);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchGreeting = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.GREETING);
      if (response.ok) {
        const data = await response.json();
        setGreeting(data.greeting);
      }
    } catch (error) {
      console.error('Error fetching greeting:', error);
    }
  };

  const fetchLastSearchResults = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.LAST_SEARCH);
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.organic && data.results.organic.length > 0) {
          setSearchResults(data.results);
          setSearchText(data.search || '');
          setCategory(data.category || '');
          // Restore selected items if they exist
          if (data.selectedItems && Array.isArray(data.selectedItems) && data.selectedItems.length > 0) {
            // Convert array to Set and filter valid indices
            const validIndices = data.selectedItems.filter(idx => 
              typeof idx === 'number' && idx >= 0 && idx < data.results.organic.length
            );
            if (validIndices.length > 0) {
              setSelectedItems(new Set(validIndices));
              setSelectAll(validIndices.length === data.results.organic.length);
            }
          }
          // Extract leads from last search results
          extractLeads(data.results, data.search || '');
        }
      }
    } catch (error) {
      console.error('Error fetching last search results:', error);
    }
  };

  // Validate and format Sri Lankan mobile number (+947XXXXXXXX format only)
  const isValidMobileNumber = (phone) => {
    if (!phone || typeof phone !== 'string') {
      return null;
    }
    
    // Remove all spaces, dashes, and parentheses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Remove leading + if present
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    // Check if it's a Sri Lankan mobile number
    // Mobile numbers: +947XXXXXXXX (12 digits total with country code)
    // Formats: +947XXXXXXXX, 947XXXXXXXX, 07XXXXXXXX
    
    // Pattern 1: Already in +947XXXXXXXX format (12 digits)
    if (cleaned.startsWith('947') && cleaned.length === 12) {
      return `+${cleaned}`;
    }
    
    // Pattern 2: Starts with 07 (10 digits) - convert to +947
    if (cleaned.startsWith('07') && cleaned.length === 10) {
      return `+94${cleaned}`;
    }
    
    // Pattern 3: Starts with 947 (11 digits) - add +
    if (cleaned.startsWith('947') && cleaned.length === 11) {
      return `+${cleaned}`;
    }
    
    // Pattern 4: Starts with 7 (9 digits) - add +94
    if (cleaned.startsWith('7') && cleaned.length === 9) {
      return `+94${cleaned}`;
    }
    
    // Not a valid mobile number format - return null to filter out
    return null;
  };

  const handleSearch = async () => {
    if (!searchText.trim()) {
      alert('Please enter a search term');
      return;
    }
    
    if (!category || category.trim() === '') {
      alert('Please select a category before searching');
      return;
    }
    
    setLoading(true);
    setSearchResults(null);
    
    try {
      const response = await fetch(API_ENDPOINTS.SEARCH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ search: searchText, category }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
        // Extract leads from results
        extractLeads(data.results, searchText);
        // Reset selections when new search is performed
        const newSelected = new Set();
        setSelectedItems(newSelected);
        setSelectAll(false);
        // Clear selections in backend
        saveSelectedItemsToBackend(newSelected);
      } else {
        const error = await response.json();
        alert(error.error || 'Error performing search');
      }
    } catch (error) {
      console.error('Error searching:', error);
      alert('Error performing search');
    } finally {
      setLoading(false);
    }
  };

  // Extract leads from search results
  const extractLeads = (results, searchPhrase) => {
    const leads = [];
    
    if (results.organic && Array.isArray(results.organic)) {
      results.organic.forEach((result) => {
        // Extract business name from title
        const businessName = result.title || '';
        
        // Extract website from link
        const website = result.link || '';
        
        // Get phone number from result (already validated by backend)
        let contactNumber = result.phone || '';
        
        // If phone not in result, try to extract from snippet
        if (!contactNumber && result.snippet) {
          const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
          const phoneMatch = result.snippet.match(phoneRegex);
          if (phoneMatch) {
            contactNumber = phoneMatch[0];
          }
        }
        
        // Validate mobile number (filter out landlines)
        contactNumber = isValidMobileNumber(contactNumber);

        // Only add if we have business name, website, and valid mobile number
        if (businessName && website && contactNumber) {
          leads.push({
            businessName: businessName.trim(),
            contactNumber: contactNumber,
            website: website.trim(),
            searchPhrase: searchPhrase.trim()
          });
        }
      });
    }

    // Also check knowledge graph
    if (results.knowledgeGraph) {
      const kg = results.knowledgeGraph;
      let contactNumber = '';
      
      if (kg.attributes) {
        Object.entries(kg.attributes).forEach(([key, value]) => {
          if (typeof value === 'string' && /phone|contact|tel|sales/i.test(key)) {
            contactNumber = value;
          } else if (typeof value === 'string') {
            const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
            const phoneMatch = value.match(phoneRegex);
            if (phoneMatch) {
              contactNumber = phoneMatch[0];
            }
          }
        });
      }

      if (kg.title && kg.website) {
        // Remove spaces from contact number
        const cleanedContactNumber = contactNumber.trim().replace(/\s+/g, '') || 'N/A';
        leads.push({
          businessName: kg.title.trim(),
          contactNumber: cleanedContactNumber,
          website: kg.website.trim(),
          searchPhrase: searchPhrase.trim()
        });
      }
    }

    setExtractedLeads(leads);
  };

  // Save selected items to backend
  const saveSelectedItemsToBackend = async (selectedSet) => {
    try {
      const selectedArray = Array.from(selectedSet);
      await fetch(API_ENDPOINTS.LAST_SEARCH_SELECTED_ITEMS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedItems: selectedArray }),
      });
    } catch (error) {
      console.error('Error saving selected items:', error);
      // Don't show error to user, it's not critical
    }
  };

  // Handle individual checkbox selection
  const handleItemSelect = (index) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      // Limit to 10 leads max
      if (newSelected.size >= 10) {
        alert('Maximum 10 leads can be selected at once. Please deselect some leads first.');
        return;
      }
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
    // Save to backend
    saveSelectedItemsToBackend(newSelected);
    // Update selectAll state based on whether all items are selected
    if (searchResults && searchResults.organic) {
      setSelectAll(newSelected.size === searchResults.organic.length && searchResults.organic.length > 0);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      const newSelected = new Set();
      setSelectedItems(newSelected);
      setSelectAll(false);
      // Save to backend
      saveSelectedItemsToBackend(newSelected);
    } else {
      // Limit to 10 leads max
      const maxSelectable = Math.min(10, searchResults.organic.length);
      const selectedIndices = new Set(Array.from({ length: maxSelectable }, (_, i) => i));
      setSelectedItems(selectedIndices);
      setSelectAll(maxSelectable === searchResults.organic.length);
      // Save to backend
      saveSelectedItemsToBackend(selectedIndices);
      if (searchResults.organic.length > 10) {
        alert('Maximum 10 leads can be selected at once. Only the first 10 leads were selected.');
      }
    }
  };

  // Extract email from text
  const extractEmail = (text) => {
    if (!text) return '';
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatch = text.match(emailRegex);
    return emailMatch ? emailMatch[0] : '';
  };

  // Download search results as CSV
  const handleDownloadCSV = () => {
    if (!searchResults || !searchResults.organic || searchResults.organic.length === 0) {
      alert('No search results to download');
      return;
    }

    // CSV headers
    const headers = ['Title', 'Contact Number', 'Website', 'Snippet', 'Email', 'Search Phrase', 'Category'];
    
    // Convert search results to CSV rows
    const csvRows = searchResults.organic.map((result) => {
      // Extract email from snippet, link, or title
      let emailId = extractEmail(result.snippet || '');
      if (!emailId) {
        emailId = extractEmail(result.link || '');
      }
      if (!emailId) {
        emailId = extractEmail(result.title || '');
      }

      // Escape CSV values (handle commas, quotes, and newlines)
      const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // If value contains comma, quote, or newline, wrap in quotes and escape quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      return [
        escapeCSV(result.title || ''),
        escapeCSV(result.phone || 'N/A'),
        escapeCSV(result.link || ''),
        escapeCSV(result.snippet || ''),
        escapeCSV(emailId || ''),
        escapeCSV(searchText || ''),
        escapeCSV(category || '')
      ].join(',');
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `search-results-${searchText.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${timestamp}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save search results to Google Sheets
  const handleSaveToGoogleSheets = async () => {
    if (!searchResults || !searchResults.organic || searchResults.organic.length === 0) {
      alert('No search results to save');
      return;
    }

    if (!searchText.trim()) {
      alert('Search phrase is required');
      return;
    }

    setSavingToSheets(true);
    try {
      const response = await fetch(API_ENDPOINTS.GOOGLE_SHEETS_SAVE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchResults: searchResults,
          searchPhrase: searchText.trim(),
          category: category || ''
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const message = `Search results saved to Google Sheets!\n\nSheet Name: ${data.sheetName}\nRows: ${data.rowCount}\n\nWould you like to open the spreadsheet?`;
        if (window.confirm(message)) {
          window.open(data.spreadsheetUrl, '_blank');
        }
      } else {
        const error = await response.json();
        let errorMessage = `Error saving to Google Sheets: ${error.error || 'Unknown error'}`;
        if (error.details) {
          errorMessage += `\n\n${error.details}`;
        }
        if (error.instructions && Array.isArray(error.instructions)) {
          errorMessage += '\n\nInstructions:\n' + error.instructions.join('\n');
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error('Error saving to Google Sheets:', error);
      alert('Error saving to Google Sheets. Please check your configuration.');
    } finally {
      setSavingToSheets(false);
    }
  };

  // Send messages to selected leads from search results
  const handleSendMessagesToSelected = async () => {
    if (selectedItems.size === 0) {
      alert('Please select at least one item to send messages');
      return;
    }

    if (!searchResults || !searchResults.organic) {
      alert('No search results available');
      return;
    }

    // Check rate limit before proceeding
    await fetchRateLimitStatus();
    let currentRateLimit = rateLimit;
    try {
      const response = await fetch(API_ENDPOINTS.RATE_LIMIT_STATUS);
      if (response.ok) {
        currentRateLimit = await response.json();
      }
    } catch (error) {
      console.error('Error fetching rate limit status:', error);
      // Use existing rateLimit state as fallback
    }
    
    const availableLeads = currentRateLimit.availableLeads ?? 0;
    const minutesRemaining = currentRateLimit.minutesRemaining ?? 0;
    
    if (!currentRateLimit.canSend) {
      alert(`Rate limit reached. You can send ${availableLeads} more lead(s). Next batch available in ${minutesRemaining} minute(s).`);
      return;
    }
    
    if (selectedItems.size > availableLeads) {
      alert(`You can only send ${availableLeads} more lead(s) right now. Please select fewer leads or wait ${minutesRemaining} minute(s) for the next batch.`);
      return;
    }

    // Check WhatsApp connection first
    try {
      const statusResponse = await fetch(API_ENDPOINTS.WHATSAPP_STATUS);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (statusData.status !== 'connected') {
          alert('WhatsApp is not connected. Please connect WhatsApp first from the Link page.');
          return;
        }
      }
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      alert('Error checking WhatsApp status. Please ensure WhatsApp is connected.');
      return;
    }

    setSendingMessages(true);
    try {
      // First, save the selected leads
      const selectedLeads = Array.from(selectedItems).map((index) => {
        const result = searchResults.organic[index];
        // Extract email from snippet, link, or title
        let emailId = extractEmail(result.snippet || '');
        if (!emailId) {
          emailId = extractEmail(result.link || '');
        }
        if (!emailId) {
          emailId = extractEmail(result.title || '');
        }

        // Validate mobile number before saving
        let contactNumber = result.phone || '';
        if (contactNumber) {
          contactNumber = isValidMobileNumber(contactNumber);
        }
        
        // Only save if we have a valid mobile number
        if (!contactNumber) {
          return null;
        }
        
        return {
          leadId: `lead_${Date.now()}_${index}`,
          businessName: result.title || '',
          contactNumber: contactNumber,
          emailId: emailId || '',
          website: result.link || '',
          searchPhrase: searchText.trim(),
          category: category || '',
          savedDate: new Date().toISOString()
        };
      }).filter(lead => lead !== null); // Remove null entries

      if (selectedLeads.length === 0) {
        alert('No valid leads with mobile numbers found in selected items');
        setSendingMessages(false);
        return;
      }

      // Save leads first
      const saveResponse = await fetch(API_ENDPOINTS.LEADS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leads: selectedLeads }),
      });

      if (!saveResponse.ok) {
        const error = await saveResponse.json();
        alert(error.error || 'Error saving leads');
        setSendingMessages(false);
        return;
      }

      const saveData = await saveResponse.json();
      const savedLeadIds = saveData.savedLeadIds || [];

      if (savedLeadIds.length === 0) {
        alert('No leads were saved. They may already exist.');
        setSendingMessages(false);
        return;
      }

      // Now send messages to the saved leads
      const sendResponse = await fetch(API_ENDPOINTS.WHATSAPP_SEND_MESSAGES, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds: savedLeadIds }),
      });

      if (sendResponse.ok) {
        const sendData = await sendResponse.json();
        const successCount = sendData.summary.success || 0;
        const skippedCount = sendData.summary.skipped || 0;
        const failedCount = sendData.summary.failed || 0;
        
        let message = `Messages sent to ${savedLeadIds.length} leads!\n\n`;
        message += `✓ ${successCount} successful`;
        if (skippedCount > 0) {
          message += `\n⚠ ${skippedCount} already sent`;
        }
        if (failedCount > 0) {
          message += `\n✗ ${failedCount} failed`;
        }
        if (sendData.rateLimit) {
          const rateLimitAvailable = sendData.rateLimit.availableLeads ?? 0;
          const rateLimitMinutes = sendData.rateLimit.minutesRemaining ?? 0;
          if (sendData.rateLimit.canSendMore) {
            message += `\n\nYou can send ${rateLimitAvailable} more lead(s) now.`;
          } else {
            message += `\n\nRate limit reached. Next batch of 10 leads available in ${rateLimitMinutes} minute(s).`;
          }
        }
        alert(message);
        fetchRateLimitStatus(); // Refresh rate limit status
      } else {
        const sendError = await sendResponse.json();
        if (sendError.error === 'Rate limit exceeded') {
          const errorAvailableLeads = sendError.availableLeads ?? 0;
          const errorMinutesRemaining = sendError.minutesRemaining ?? 0;
          alert(`${sendError.message || 'Rate limit exceeded'}\n\nAvailable: ${errorAvailableLeads} lead(s)\nWait time: ${errorMinutesRemaining} minute(s)`);
          fetchRateLimitStatus(); // Refresh rate limit status
        } else {
          alert(`Leads saved successfully, but error sending messages: ${sendError.error || 'Failed to send messages'}`);
        }
      }

      // Update total leads count
      setTotalLeads(saveData.totalLeads);
      // Update analytics if provided
      if (saveData.analytics) {
        setReachedLeads(saveData.analytics.reachedLeads || 0);
      }
      // Clear selections after sending
      setSelectedItems(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error('Error sending messages:', error);
      alert('Error sending messages. Please try again.');
    } finally {
      setSendingMessages(false);
    }
  };

  // Save selected leads to backend
  const handleSaveSelectedLeads = async () => {
    if (selectedItems.size === 0) {
      alert('Please select at least one item to save');
      return;
    }

    if (!searchResults || !searchResults.organic) {
      alert('No search results available');
      return;
    }

    setSavingLeads(true);
    try {
      const selectedLeads = Array.from(selectedItems).map((index) => {
        const result = searchResults.organic[index];
        // Extract email from snippet, link, or title
        let emailId = extractEmail(result.snippet || '');
        if (!emailId) {
          emailId = extractEmail(result.link || '');
        }
        if (!emailId) {
          emailId = extractEmail(result.title || '');
        }

        // Validate mobile number before saving
        let contactNumber = result.phone || '';
        if (contactNumber) {
          contactNumber = isValidMobileNumber(contactNumber);
        }
        
        // Only save if we have a valid mobile number
        if (!contactNumber) {
          return null;
        }
        
        return {
          leadId: `lead_${Date.now()}_${index}`,
          businessName: result.title || '',
          contactNumber: contactNumber,
          emailId: emailId || '',
          website: result.link || '',
          searchPhrase: searchText.trim(),
          category: category || '',
          savedDate: new Date().toISOString()
        };
      }).filter(lead => lead !== null); // Remove null entries

      const response = await fetch(API_ENDPOINTS.LEADS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leads: selectedLeads }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.count > 0) {
          let message = `Successfully saved ${data.count} lead(s)!`;
          if (data.count < selectedLeads.length) {
            message += `\nNote: ${selectedLeads.length - data.count} lead(s) were skipped (may already exist or missing contact numbers).`;
          }
          message += `\n\nTotal leads: ${data.totalLeads}`;
          message += `\n\nYou can send messages to these leads from the Leads page.`;
          alert(message);
        } else {
          alert('No new leads were saved. They may already exist in your leads list.');
        }
        
        // Update total leads count
        setTotalLeads(data.totalLeads);
        // Update analytics if provided
        if (data.analytics) {
          setReachedLeads(data.analytics.reachedLeads || 0);
        }
        // Clear selections after saving
        const newSelected = new Set();
        setSelectedItems(newSelected);
        setSelectAll(false);
        // Clear selections in backend
        saveSelectedItemsToBackend(newSelected);
      } else {
        const error = await response.json();
        alert(error.error || 'Error saving leads');
      }
    } catch (error) {
      console.error('Error saving leads:', error);
      alert('Error saving leads');
    } finally {
      setSavingLeads(false);
    }
  };

  return (
    <div className="container mt-4">
      {greeting && (
        <div className="alert alert-info mb-4" style={{ borderRadius: '12px', border: 'none', background: '#eff6ff', color: '#1e40af', padding: '16px 20px' }}>
          <strong>Greeting:</strong> Hi {greeting}
        </div>
      )}
      <h2 className="mb-4">Analytics</h2>
      
      {/* Analytics Cards */}
      <div className="row g-4 mb-5">
        <div className="col-md-6 col-lg-3">
          <div className="card" style={{ borderLeft: '4px solid #6366f1' }}>
            <div className="card-body">
              <h6 className="card-title text-muted mb-2" style={{ fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Leads</h6>
              <h2 className="mb-0" style={{ color: '#6366f1', fontWeight: '700', fontSize: '32px' }}>{totalLeads}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="card-body">
              <h6 className="card-title text-muted mb-2" style={{ fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Search Results</h6>
              <h2 className="mb-0" style={{ color: '#10b981', fontWeight: '700', fontSize: '32px' }}>
                {searchResults && searchResults.organic ? searchResults.organic.length : 0}
              </h2>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="card-body">
              <h6 className="card-title text-muted mb-2" style={{ fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reached Leads</h6>
              <h2 className="mb-0" style={{ color: '#f59e0b', fontWeight: '700', fontSize: '32px' }}>{reachedLeads}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
            <div className="card-body">
              <h6 className="card-title text-muted mb-2" style={{ fontSize: '13px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completed</h6>
              <h2 className="mb-0" style={{ color: '#3b82f6', fontWeight: '700', fontSize: '32px' }}>0</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="card">
        <div className="card-body">
          <h5 className="card-title mb-4" style={{ fontSize: '20px', fontWeight: '600' }}>Search</h5>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Enter search term..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>
            <div className="col-12 col-md-4">
              <select
                className={`form-select ${!category ? 'is-invalid' : ''}`}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                }}
                style={{ cursor: 'pointer' }}
                required
              >
                {categories.length === 0 ? (
                  <option value="" disabled>No categories available</option>
                ) : (
                  <>
                    <option value="">-- Select Category --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {!category && categories.length > 0 && (
                <div className="invalid-feedback d-block">Please select a category</div>
              )}
              {categories.length === 0 && (
                <small className="text-muted d-block mt-1">Add categories in Settings page</small>
              )}
            </div>
            <div className="col-12 col-md-2">
              <button
                className="btn btn-primary w-100"
                onClick={handleSearch}
                disabled={!category || category.trim() === '' || categories.length === 0}
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search Results Table */}
      {loading && (
        <div className="text-center mt-4">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Searching pages...</p>
        </div>
      )}

      {searchResults && searchResults.organic && searchResults.organic.length > 0 && (
        <div className="card mt-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h5 className="card-title mb-0">Search Results - {searchResults.organic.length} results</h5>
                <small className={`${rateLimit.canSend ? 'text-success' : 'text-warning'}`}>
                  Rate Limit: {rateLimit.leadsSent ?? 0}/{rateLimit.maxLeads ?? 10} sent
                  {!rateLimit.canSend && ` • Next batch in ${rateLimit.minutesRemaining ?? 0} min`}
                </small>
              </div>
              <div className="d-flex gap-2">
                <button
                  className="btn btn-outline-secondary"
                  onClick={handleDownloadCSV}
                  title="Download search results as CSV"
                >
                  ⬇ Download CSV
                </button>
                <button
                  className="btn btn-outline-primary"
                  onClick={handleSaveToGoogleSheets}
                  disabled={savingToSheets}
                  title="Save search results to Google Sheets"
                >
                  {savingToSheets ? 'Saving...' : '📊 Save to Google Sheets'}
                </button>
                {selectedItems.size > 0 && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={handleSaveSelectedLeads}
                      disabled={savingLeads || sendingMessages}
                    >
                      {savingLeads ? 'Saving...' : `Save Selected (${selectedItems.size})`}
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleSendMessagesToSelected}
                      disabled={savingLeads || sendingMessages || !rateLimit.canSend || selectedItems.size > rateLimit.availableLeads}
                      title={!rateLimit.canSend ? `Rate limit reached. Wait ${rateLimit.minutesRemaining ?? 0} minute(s).` : ''}
                    >
                      {sendingMessages ? 'Sending...' : `Send Messages (${selectedItems.size})`}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="form-check-input"
                      />
                    </th>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Title</th>
                    <th>Contact Number</th>
                    <th>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.organic.map((result, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(index)}
                          onChange={() => handleItemSelect(index)}
                          className="form-check-input"
                          disabled={selectedItems.size >= 10 && !selectedItems.has(index)}
                        />
                      </td>
                      <td>
                        <span className="text-muted fw-bold">{index + 1}</span>
                      </td>
                      <td>
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-decoration-none fw-bold"
                        >
                          {result.title}
                        </a>
                      </td>
                      <td>
                        {result.phone || 'N/A'}
                      </td>
                      <td>
                        <a
                          href={result.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-decoration-none text-muted small"
                        >
                          {result.link}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {searchResults && (!searchResults.organic || searchResults.organic.length === 0) && (
        <div className="card mt-4">
          <div className="card-body">
            <p className="text-muted mb-0">No search results found.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;

