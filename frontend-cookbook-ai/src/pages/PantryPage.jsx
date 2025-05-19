// src/pages/PantryPage.jsx
import { useState, useEffect } from 'react';
import './PantryPage.css';
import { Trash2 } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { API_BASE_URL } from "../config";
import { registerLocale } from 'react-datepicker';
import hr from 'date-fns/locale/hr';
registerLocale('hr', hr);

const CATEGORY_MAP = {
  'Kod kuće uvijek imam': 'always_have',
  'Danas dodatno imam': 'additional_today',
};

const initialFilterGroups = [
  {
    groupName: 'Kod kuće uvijek imam',
    options: [],
    allowCustomAdd: true,
  },
  {
    groupName: 'Dozvoljen način pripreme',
    options: ['svi načini pripreme', 'kuhano', 'pečeno', 'prženo'],
    allowCustomAdd: false,
  },
  {
    groupName: 'Danas dodatno imam',
    options: [],
    allowCustomAdd: true,
  },
];

const dailyTips = [
  "Ako imaš ostatke povrća, kombiniraj ih u brzinsku juhu ili stir-fry!",
  "Riža od jučer? Dodaj jaje i povrće za fini prženi rižoto.",
  "Kruh je star? Ispeci bruskete s maslinovim uljem i češnjakom.",
  "Kuhana jaja + jogurt + malo češnjaka = brzinski proteinski snack!",
  "Zrelo voće? Napravi smoothie ili ga dodaj u zobene pahuljice.",
  "Parmezan i tijesto u smočnici? Spreman si za brzi pasta obrok.",
  "Nemoj baciti koru sira – koristi je za dodatni okus u juhama.",
  "Kombiniraj ostatke mesa s tortiljama za brze wrapove!",
  "Tikvice i jaja = odlična fritaja bez puno truda.",
  "Kuhani krumpir? Ispeci ga s malo začina za super prilog.",
];

function PantryPage() {
  const [validationMessage, setValidationMessage] = useState('');
  const [filterSelections, setFilterSelections] = useState({});
  const [filterGroups, setFilterGroups] = useState(initialFilterGroups);
  const [newFilterValues, setNewFilterValues] = useState({});
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [prepTime, setPrepTime] = useState(20);
  const [currentStep, setCurrentStep] = useState(0);
  const [dailyTip, setDailyTip] = useState('');

  // Set a random daily tip when reaching step 2
  useEffect(() => {
    if (currentStep === 2) {
      const idx = Math.floor(Math.random() * dailyTips.length);
      setDailyTip(dailyTips[idx]);
    }
  }, [currentStep]);

  // Fetch pantry items on component mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    fetch(`${API_BASE_URL}/pantry/`, { // Added trailing slash to be consistent
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log('Fetched pantry data:', data); // Add logging to debug
        
        setFilterGroups(prev => {
          const updated = [...prev];
          // Set "always have" items
          updated[0] = {
            ...updated[0],
            options: data
              .filter(item => item.category === 'always_have')
              .map(item => ({ id: item.id, name: item.name })),
          };
          // Set "additional today" items
          updated[2] = {
            ...updated[2],
            options: data
              .filter(item => item.category === 'additional_today')
              .map(item => ({ id: item.id, name: item.name })),
          };
          return updated;
        });

        // Initialize selections based on fetched data
        setFilterSelections({
          'Kod kuće uvijek imam': data
            .filter(item => item.category === 'always_have')
            .map(item => item.name),
          'Danas dodatno imam': data
            .filter(item => item.category === 'additional_today')
            .map(item => item.name),
        });
      })
      .catch(err => console.error('Greška kod dohvata sastojaka:', err));
  }, []);

  // Save selections to localStorage when they change
  useEffect(() => {
    const user = localStorage.getItem('loggedInUser');
    if (!user) return;
    const all = JSON.parse(localStorage.getItem('filtersByUser') || '{}');
    all[user] = filterSelections;
    localStorage.setItem('filtersByUser', JSON.stringify(all));
  }, [filterSelections]);

  // Function to toggle selection of a filter option
  const toggleFilter = (group, optionName) => {
    setFilterSelections(prev => {
      const arr = prev[group] || [];
      const exists = arr.includes(optionName);
      return {
        ...prev,
        [group]: exists ? arr.filter(x => x !== optionName) : [...arr, optionName],
      };
    });
  };

  // Function to remove a filter option (ingredient)
  const removeFilterOption = async (groupIndex, option) => {
    // option: { id, name }
    const { id, name } = option;
    const token = localStorage.getItem('accessToken');
    if (!token) return alert("Nisi prijavljen!");

    try {
      // Use the by-name endpoint as defined in your backend
      const res = await fetch(`${API_BASE_URL}/pantry/by-name/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Greška pri brisanju.');
      }
      
      // Update groups state: Remove the option from the options array
      setFilterGroups(prevGroups => {
        const updatedGroups = [...prevGroups];
        updatedGroups[groupIndex] = {
          ...updatedGroups[groupIndex],
          options: updatedGroups[groupIndex].options.filter(o => o.id !== id)
        };
        return updatedGroups;
      });

      // Update selections state: Remove the option name from the selections array
      const groupName = filterGroups[groupIndex].groupName;
      setFilterSelections(prev => ({
        ...prev,
        [groupName]: (prev[groupName] || []).filter(x => x !== name),
      }));

    } catch (e) {
      alert('Greška: ' + e.message);
    }
  };

  // Function to handle adding a custom filter option (ingredient)
  const handleAddCustomFilter = async (groupIndex) => {
    const group = filterGroups[groupIndex];
    const val = (newFilterValues[group.groupName] || '').trim();
    if (!val) return; // Don't add empty values

    // Check for duplicate names within the current options
    if (group.options.some(o => o.name === val)) {
      console.log(`Duplicate item "${val}" in group "${group.groupName}"`);
      setNewFilterValues(prev => ({ ...prev, [group.groupName]: '' })); // Clear input even if duplicate
      return; // Don't add duplicates
    }

    // Get the correct category based on the group name
    const category = CATEGORY_MAP[group.groupName] || 'additional_today';
    
    // For local handling of "Danas dodatno imam" items without backend interaction
    if (group.groupName === 'Danas dodatno imam' && false) { // Disabled local-only handling for consistency
      setFilterGroups(prevGroups => {
        const updatedGroups = [...prevGroups];
        updatedGroups[groupIndex] = {
          ...updatedGroups[groupIndex],
          options: [...updatedGroups[groupIndex].options, { id: Date.now(), name: val }]
        };
        return updatedGroups;
      });
      setNewFilterValues(prev => ({ ...prev, [group.groupName]: '' }));
      toggleFilter(group.groupName, val);
      return;
    }

    // For all groups, post to backend with the correct category
    const token = localStorage.getItem('accessToken');
    if (!token) return alert("Nisi prijavljen!");

    try {
      const res = await fetch(`${API_BASE_URL}/pantry/`, { // Added trailing slash to be consistent
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: category, // Use the mapped category based on the group
          name: val,
          temporary: category === 'additional_today', // Only "additional today" items are temporary
        }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Greška pri dodavanju.');
      }
      
      const created = await res.json();
      console.log('Created item:', created); // Add logging to debug

      // Update groups state with the item returned from the backend
      setFilterGroups(prevGroups => {
        const updatedGroups = [...prevGroups];
        updatedGroups[groupIndex] = {
          ...updatedGroups[groupIndex],
          options: [...updatedGroups[groupIndex].options, { id: created.id, name: created.name }]
        };
        return updatedGroups;
      });

      setNewFilterValues(prev => ({ ...prev, [group.groupName]: '' })); // Clear input
      toggleFilter(group.groupName, created.name); // Select the newly added item
    } catch (e) {
      alert('Greška: ' + e.message);
    }
  };

  // Function to handle initiating the recipe search
  const handleRecipeSearch = () => {
    const filters = Object.entries(filterSelections)
      .map(([g, arr]) => `${g}: ${arr.join(', ')}`)
      .join('\n');
    const prompt = `Želim recepte za ${numberOfPeople} osoba.\nVrijeme pripreme: do ${prepTime} minuta.\nMoji filteri:\n${filters}\nNapiši mi 5 prijedloga recepata.`;
    console.log('Prompt za AI:', prompt);
    setCurrentStep(4); // Move to the review step
    // Here you would typically make the API call to your AI/recipe generation endpoint
  };

  return (
    <div className="pantry-grid">
      <div className="step-title">
        {currentStep === 0 && <p>Unesi što uvijek imaš kod kuće</p>}
        {currentStep === 1 && <p>Odaberi načine pripreme</p>}
        {currentStep === 2 && <p>Dodaj što danas dodatno imaš</p>}
        {currentStep === 3 && <p>Za koliko osoba kuhaš i koliko imaš vremena?</p>}
        {currentStep === 4 && <p>Sve spremno? Pogledaj što ćemo kuhati!</p>}
      </div>

      <div className="progress-container">
        <div
          className="progress-bar"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        />
      </div>

      <div className="pantry-section filter-section">
        {/* STEP 0: Kod kuće uvijek imam */}
        {currentStep === 0 && (
          <div className="filter-group">
            <strong>{filterGroups[0].groupName}</strong>
            {/* Check if options array is empty */}
            {filterGroups[0].options.length === 0 && (
              <div className="empty-hint">
                <p>Ovdje možete dodati stavke koje uvijek imate kod kuće.</p>
                <p>Možete ih i obrisati kasnije ako se nešto promijeni.</p>
              </div>
            )}
            <div className="filter-options">
              {/* Map over options to display them */}
              {filterGroups[0].options.map(opt => (
                <div key={opt.id} className="option-with-remove">
                  <span>{opt.name}</span>
                  <button
                    onClick={() => removeFilterOption(0, opt)}
                    className="icon-button"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
            <div className="add-custom-filter">
              <input
                type="text"
                placeholder="Dodaj novi sastojak..."
                value={newFilterValues[filterGroups[0].groupName] || ''}
                onChange={e =>
                  setNewFilterValues({
                    ...newFilterValues,
                    [filterGroups[0].groupName]: e.target.value,
                  })
                }
              />
              <button
                className="button-add-circle"
                onClick={() => handleAddCustomFilter(0)}
              >
                +
              </button>
            </div>
            <div className="navigation-buttons right-align">
              <button
                className="button-orange"
                onClick={() => {
                  // Validate that there's at least one item before proceeding
                  if (filterGroups[0].options.length > 0) {
                    setValidationMessage('');
                    // Automatically select all 'always_have' items when moving to the next step
                    setFilterSelections(prev => ({
                      ...prev,
                      [filterGroups[0].groupName]: filterGroups[0].options.map(
                        o => o.name
                      ),
                    }));
                    setCurrentStep(1); // Move to next step
                  } else {
                    setValidationMessage(
                      'Unesi barem jedan sastojak da bi nastavio dalje.'
                    );
                  }
                }}
              >
                Sljedeće
              </button>
            </div>
            {/* Display validation message if any */}
            {validationMessage && (
              <div className="validation-message">{validationMessage}</div>
            )}
          </div>
        )}

        {/* STEP 1: Dozvoljen način pripreme */}
        {currentStep === 1 && (
          <div className="filter-group">
            <strong>{filterGroups[1].groupName}</strong>
            <div className="filter-options">
              {/* Map over options (simple strings) */}
              {filterGroups[1].options.map(opt => (
                <div key={opt} className="option">
                  <label>
                    <input
                      type="checkbox"
                      checked={
                        filterSelections[filterGroups[1].groupName]?.includes(
                          opt
                        ) || false
                      }
                      onChange={() =>
                        toggleFilter(filterGroups[1].groupName, opt)
                      }
                    />
                    {opt}
                  </label>
                </div>
              ))}
            </div>
            <div
              className="navigation-buttons"
              style={{ justifyContent: 'space-between' }}
            >
              <button
                className="button-orange"
                onClick={() => {
                  setValidationMessage('');
                  setCurrentStep(0); // Go back to previous step
                }}
              >
                Natrag
              </button>
              <button
                className="button-orange"
                onClick={() => {
                  // Validate that at least one preparation method is selected
                  const sel =
                    filterSelections[filterGroups[1].groupName]?.length || 0;
                  if (sel > 0) {
                    setValidationMessage('');
                    setCurrentStep(2); // Move to next step
                  } else {
                    setValidationMessage(
                      'Odaberi barem jedan način pripreme da bi nastavio dalje.'
                    );
                  }
                }}
              >
                Sljedeće
              </button>
            </div>
            {/* Display validation message if any */}
            {validationMessage && (
              <div className="validation-message">{validationMessage}</div>
            )}
          </div>
        )}

        {/* STEP 2: Danas dodatno imam */}
        {currentStep === 2 && (
          <div className="filter-group">
            <strong>{filterGroups[2].groupName}</strong>
            <div className="daily-tip">
              <em>{dailyTip}</em> {/* Display the random daily tip */}
            </div>
             {/* Check if options array is empty */}
            {filterGroups[2].options.length === 0 && (
              <div className="empty-hint">
                <p>Dodaj sastojke koje danas dodatno imaš kod kuće.</p>
              </div>
            )}
            <div className="filter-options">
               {/* Map over options (objects with id and name) */}
              {filterGroups[2].options.map(opt => (
                <div key={opt.id} className="option fade-in"> {/* Use opt.id as key */}
                  <label>
                    <input
                      type="checkbox"
                       // Check if the option name is included in the selections for this group
                      checked={
                        filterSelections[filterGroups[2].groupName]?.includes(
                          opt.name
                        ) || false
                      }
                      onChange={() =>
                        toggleFilter(filterGroups[2].groupName, opt.name) // Toggle selection using option name
                      }
                    />
                    {opt.name} {/* Display option name */}
                  </label>
                </div>
              ))}
            </div>
            <div className="add-custom-filter">
              <input
                type="text"
                placeholder="Dodaj novi sastojak..."
                value={newFilterValues[filterGroups[2].groupName] || ''}
                onChange={e =>
                  setNewFilterValues({
                    ...newFilterValues,
                    [filterGroups[2].groupName]: e.target.value,
                  })
                }
              />
              <button
                className="button-add-circle"
                onClick={() => handleAddCustomFilter(2)} // Pass group index
              >
                +
              </button>
            </div>
            <div
              className="navigation-buttons"
              style={{ justifyContent: 'space-between' }}
            >
              <button
                className="button-orange"
                onClick={() => setCurrentStep(1)} // Go back
              >
                Natrag
              </button>
              <button
                className="button-orange"
                onClick={() => setCurrentStep(3)} // Move to next step
              >
                Sljedeće
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Cooking Parameters */}
        {currentStep === 3 && (
          <div className="cooking-params">
            <h3>Detalji pripreme</h3>
            <div className="cooking-param">
              <label htmlFor="peopleCount">Kuham za:</label>
              <input
                id="peopleCount"
                type="number"
                min="1"
                value={numberOfPeople}
                onChange={e => setNumberOfPeople(+e.target.value)} // Update number of people state
              />
              <span>osoba</span>
            </div>
            <div className="cooking-param">
              <label htmlFor="prepTime">
                Vrijeme pripreme: {prepTime} min {/* Display current prep time */}
              </label>
              <input
                id="prepTime"
                type="range"
                min="5"
                max="120"
                step="5"
                value={prepTime}
                onChange={e => setPrepTime(+e.target.value)} // Update prep time state
              />
            </div>
            <div
              className="navigation-buttons"
              style={{ justifyContent: 'space-between' }}
            >
              <button
                className="button-orange"
                onClick={() => setCurrentStep(2)} // Go back
              >
                Natrag
              </button>
              <button
                className="button-orange"
                onClick={handleRecipeSearch} // Trigger recipe search
              >
                Prikaži odabrano
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review before cooking */}
        {currentStep === 4 && (
          <div className="filter-group">
            <strong>Tvoj pregled prije kuhanja</strong>
            <div style={{ marginTop: '1rem' }}>
              {/* Display selected 'always_have' items */}
              <h4>Kod kuće uvijek imam:</h4>
              <ul>
                {(filterSelections['Kod kuće uvijek imam'] || []).map(i => (
                  <li key={i}>{i}</li> // Use item name as key (assuming names are unique within selections)
                ))}
              </ul>
               {/* Display selected 'additional_today' items if any */}
              {(filterSelections['Danas dodatno imam'] || []).length > 0 && (
                <>
                  <h4>Danas dodatno imam:</h4>
                  <ul>
                    {filterSelections['Danas dodatno imam'].map(i => (
                      <li key={i}>{i}</li> // Use item name as key
                    ))}
                  </ul>
                </>
              )}
               {/* Display selected preparation methods */}
              <h4>Način pripreme:</h4>
              <ul>
                {(filterSelections['Dozvoljen način pripreme'] || []).map(
                  i => (
                    <li key={i}>{i}</li> // Use method name as key
                  )
                )}
              </ul>
               {/* Display number of people and prep time */}
              <h4>Broj osoba i vrijeme pripreme:</h4>
              <p>
                Kuham za <strong>{numberOfPeople}</strong> osoba, vrijeme
                pripreme do <strong>{prepTime} minuta</strong>.
              </p>
            </div>
            <div
              className="navigation-buttons"
              style={{
                justifyContent: 'space-between',
                marginTop: '2rem',
              }}
            >
              <button
                className="button-orange"
                onClick={() => setCurrentStep(3)} // Go back
              >
                Natrag
              </button>
              <button
                className="search-button"
                onClick={() => {
                  alert('Kuhanje započeto!'); // Use a better UI element than alert
                  // Reset state to initial values after starting cooking
                  // Note: This clears all selections and added items.
                  // Consider if you want to persist 'always_have' items.
                  setFilterGroups(initialFilterGroups); // Reset to initial state
                  setCurrentStep(0); // Go back to the first step
                  setFilterSelections({}); // Clear selections
                  setNewFilterValues({}); // Clear new item input values
                  setNumberOfPeople(1); // Reset number of people
                  setPrepTime(20); // Reset prep time
                }}
              >
                Idemo kuhati!
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PantryPage;