import { useState, useEffect } from 'react';

function Home() {
  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedLeads, setExtractedLeads] = useState([]);
  const [savingLeads, setSavingLeads] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [totalLeads, setTotalLeads] = useState(0);
  const [reachedLeads, setReachedLeads] = useState(0);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchTotalLeads();
    fetchAnalytics();
    fetchLastSearchResults();
    fetchGreeting();
    // Update greeting every minute
    const interval = setInterval(fetchGreeting, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:3060/api/categories');
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
      const response = await fetch('http://localhost:3060/api/leads');
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
      const response = await fetch('http://localhost:3060/api/analytics');
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
      const response = await fetch('http://localhost:3060/api/greeting');
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
      const response = await fetch('http://localhost:3060/api/last-search');
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.organic && data.results.organic.length > 0) {
          setSearchResults(data.results);
          setSearchText(data.search || '');
          setCategory(data.category || '');
          // Extract leads from last search results
          extractLeads(data.results, data.search || '');
        }
      }
    } catch (error) {
      console.error('Error fetching last search results:', error);
    }
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
      const response = await fetch('http://localhost:3060/api/search', {
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
        setSelectedItems(new Set());
        setSelectAll(false);
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
        
        // Try to extract contact number from snippet, attributes, or sitelinks
        let contactNumber = '';
        if (result.snippet) {
          const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
          const phoneMatch = result.snippet.match(phoneRegex);
          if (phoneMatch) {
            contactNumber = phoneMatch[0];
          }
        }
        if (!contactNumber && result.attributes) {
          Object.entries(result.attributes).forEach(([key, value]) => {
            if (typeof value === 'string' && /phone|contact|tel/i.test(key)) {
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

        // Only add if we have at least business name and website
        if (businessName && website) {
          // Remove spaces from contact number
          const cleanedContactNumber = contactNumber.trim().replace(/\s+/g, '') || 'N/A';
          leads.push({
            businessName: businessName.trim(),
            contactNumber: cleanedContactNumber,
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

  // Handle individual checkbox selection
  const handleItemSelect = (index) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
    // Update selectAll state based on whether all items are selected
    if (searchResults && searchResults.organic) {
      setSelectAll(newSelected.size === searchResults.organic.length && searchResults.organic.length > 0);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
      setSelectAll(false);
    } else {
      const allIndices = new Set(searchResults.organic.map((_, index) => index));
      setSelectedItems(allIndices);
      setSelectAll(true);
    }
  };

  // Extract email from text
  const extractEmail = (text) => {
    if (!text) return '';
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatch = text.match(emailRegex);
    return emailMatch ? emailMatch[0] : '';
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

        return {
          leadId: `lead_${Date.now()}_${index}`,
          businessName: result.title || '',
          contactNumber: result.phone ? result.phone.replace(/\s+/g, '') : '',
          emailId: emailId || '',
          website: result.link || '',
          searchPhrase: searchText.trim(),
          category: category || '',
          savedDate: new Date().toISOString()
        };
      });

      const response = await fetch('http://localhost:3060/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leads: selectedLeads }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully saved ${data.count} leads! Total leads: ${data.totalLeads}`);
        // Update total leads count
        setTotalLeads(data.totalLeads);
        // Update analytics if provided
        if (data.analytics) {
          setReachedLeads(data.analytics.reachedLeads || 0);
        }
        // Clear selections after saving
        setSelectedItems(new Set());
        setSelectAll(false);
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
        <div className="alert alert-info mb-3">
          <strong>Greeting:</strong> Hi {greeting}
        </div>
      )}
      <h2 className="mb-4">Analytics</h2>
      
      {/* Analytics Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-6 col-lg-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Total Leads</h5>
              <h3 className="text-primary">{totalLeads}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Current Search Results</h5>
              <h3 className="text-success">
                {searchResults && searchResults.organic ? searchResults.organic.length : 0}
              </h3>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Reached Leads</h5>
              <h3 className="text-warning">{reachedLeads}</h3>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Completed</h5>
              <h3 className="text-info">0</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="card">
        <div className="card-body">
          <h5 className="card-title mb-3">Search</h5>
          <div className="row g-3">
            <div className="col-md-6">
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
            <div className="col-md-4">
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
            <div className="col-md-2">
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
              <h5 className="card-title mb-0">Search Results - {searchResults.organic.length} results</h5>
              {selectedItems.size > 0 && (
                <button
                  className="btn btn-success"
                  onClick={handleSaveSelectedLeads}
                  disabled={savingLeads}
                >
                  {savingLeads ? 'Saving...' : `Save Selected (${selectedItems.size})`}
                </button>
              )}
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
                        />
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
                        {result.phone ? result.phone.replace(/\s+/g, '') : 'N/A'}
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

