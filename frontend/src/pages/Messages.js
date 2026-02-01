import { useState, useEffect } from 'react';

function Messages() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [type1Message1, setType1Message1] = useState('');
  const [type1Message2, setType1Message2] = useState('');
  const [type2Message1, setType2Message1] = useState('');
  const [type2Message2, setType2Message2] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedMessages, setSavedMessages] = useState([]);
  const [showSidePanel, setShowSidePanel] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchMessages();
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

  const fetchMessages = async () => {
    try {
      const response = await fetch('http://localhost:3060/api/messages');
      if (response.ok) {
        const data = await response.json();
        setSavedMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  // Load messages into textareas when category or savedMessages change
  useEffect(() => {
    if (selectedCategory && savedMessages.length > 0) {
      const existing = savedMessages.find(msg => msg.category === selectedCategory);
      if (existing) {
        setType1Message1(existing.type1.message1);
        setType1Message2(existing.type1.message2);
        setType2Message1(existing.type2.message1);
        setType2Message2(existing.type2.message2);
      } else {
        // Clear fields if no existing messages for this category
        setType1Message1('');
        setType1Message2('');
        setType2Message1('');
        setType2Message2('');
      }
    } else if (!selectedCategory) {
      // Clear fields if no category selected
      setType1Message1('');
      setType1Message2('');
      setType2Message1('');
      setType2Message2('');
    }
  }, [selectedCategory, savedMessages]);

  const handleSave = async (e) => {
    e.preventDefault();
    
    if (!selectedCategory) {
      alert('Please select a category');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:3060/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: selectedCategory,
          type1Message1,
          type1Message2,
          type2Message1,
          type2Message2
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Messages saved successfully!');
        // Refresh messages list to update the state
        await fetchMessages();
      } else {
        const error = await response.json();
        alert(error.error || 'Error saving messages');
      }
    } catch (error) {
      console.error('Error saving messages:', error);
      alert('Error saving messages');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        {/* Main Content Area */}
        <div className={showSidePanel ? "col-lg-8" : "col-12"}>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Messages</h2>
            <button
              className="btn btn-outline-secondary"
              onClick={() => setShowSidePanel(!showSidePanel)}
            >
              {showSidePanel ? 'Hide' : 'View'} Messages
            </button>
          </div>

      {/* Category Selection */}
      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title mb-3">Select Category</h5>
          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Message Forms */}
      {selectedCategory && (
        <form onSubmit={handleSave}>
          {/* Type 1 Messages */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title mb-3">Type 1 Messages</h5>
              <div className="mb-3">
                <label className="form-label">Message 1</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={type1Message1}
                  onChange={(e) => setType1Message1(e.target.value)}
                  placeholder="Enter Type 1 Message 1"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Message 2</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={type1Message2}
                  onChange={(e) => setType1Message2(e.target.value)}
                  placeholder="Enter Type 1 Message 2"
                  required
                />
              </div>
            </div>
          </div>

          {/* Type 2 Messages */}
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title mb-3">Type 2 Messages</h5>
              <div className="mb-3">
                <label className="form-label">Message 1</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={type2Message1}
                  onChange={(e) => setType2Message1(e.target.value)}
                  placeholder="Enter Type 2 Message 1"
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Message 2</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={type2Message2}
                  onChange={(e) => setType2Message2(e.target.value)}
                  placeholder="Enter Type 2 Message 2"
                  required
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mb-4">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Messages'}
            </button>
          </div>
        </form>
      )}
        </div>

        {/* Side Panel - View Messages */}
        {showSidePanel && (
          <div className="col-lg-4">
            <div className="card" style={{ position: 'sticky', top: '20px' }}>
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Saved Messages</h5>
                <button
                  className="btn btn-sm btn-close"
                  onClick={() => setShowSidePanel(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="card-body" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                {savedMessages.length === 0 ? (
                  <p className="text-muted text-center">No messages saved yet</p>
                ) : (
                  savedMessages.map((msg) => (
                    <div key={msg.id} className="mb-4 pb-4 border-bottom">
                      <h6 className="text-primary mb-3">
                        <strong>{msg.category}</strong>
                      </h6>
                      
                      <div className="mb-3">
                        <small className="text-muted d-block mb-1">Type 1 Messages:</small>
                        <div className="bg-light p-2 rounded mb-2">
                          <small><strong>Message 1:</strong></small>
                          <p className="mb-1 small">{msg.type1.message1}</p>
                        </div>
                        <div className="bg-light p-2 rounded">
                          <small><strong>Message 2:</strong></small>
                          <p className="mb-0 small">{msg.type1.message2}</p>
                        </div>
                      </div>

                      <div>
                        <small className="text-muted d-block mb-1">Type 2 Messages:</small>
                        <div className="bg-light p-2 rounded mb-2">
                          <small><strong>Message 1:</strong></small>
                          <p className="mb-1 small">{msg.type2.message1}</p>
                        </div>
                        <div className="bg-light p-2 rounded">
                          <small><strong>Message 2:</strong></small>
                          <p className="mb-0 small">{msg.type2.message2}</p>
                        </div>
                      </div>

                      <button
                        className="btn btn-sm btn-outline-primary mt-2 w-100"
                        onClick={() => {
                          setSelectedCategory(msg.category);
                          setShowSidePanel(false);
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;

