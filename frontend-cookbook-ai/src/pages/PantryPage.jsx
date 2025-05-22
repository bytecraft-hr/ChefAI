import { useState, useEffect } from 'react'
import './PantryPage.css'
import { Trash2 } from 'lucide-react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { registerLocale } from 'react-datepicker'
import hr from 'date-fns/locale/hr'
import { Tag } from 'antd'
import 'antd/dist/reset.css' 

registerLocale('hr', hr)

const initialFilterGroups = [
  {
    groupName: 'Kod kuće uvijek imam',
    options: [],
    allowCustomAdd: true
  },
  {
    groupName: 'Dozvoljen način pripreme',
    options: ['svi načini pripreme', 'kuhano', 'pečeno', 'prženo'],
    allowCustomAdd: false
  },
  {
    groupName: 'Danas dodatno imam',
    options: [],
    allowCustomAdd: true
  }
]


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
  "Kuhani krumpir? Ispeci ga s malo začina za super prilog."
]



function PantryPage() {
  const [validationMessage, setValidationMessage] = useState('')
  const [filterSelections, setFilterSelections] = useState({})
  const [filterGroups, setFilterGroups] = useState(initialFilterGroups)
  const [newFilterValues, setNewFilterValues] = useState({})
  const [numberOfPeople, setNumberOfPeople] = useState(1)
  const [prepTime, setPrepTime] = useState(20)
  const [currentStep, setCurrentStep] = useState(0)
  const [dailyTip, setDailyTip] = useState('')



  useEffect(() => {
    if (currentStep === 2) {
      const randomIndex = Math.floor(Math.random() * dailyTips.length)
      setDailyTip(dailyTips[randomIndex])
    }
  }, [currentStep])



useEffect(() => {
  const token = localStorage.getItem('accessToken');
  if (!token) return;

  fetch('http://localhost:8000/pantry', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then((res) => res.json())
    .then((data) => {
      const updatedGroups = [...filterGroups];
      updatedGroups[0].options = data
        .filter(item => item.category === 'Kod kuće uvijek imam')
        .map(item => item.name);

      updatedGroups[2].options = data
        .filter(item => item.category === 'Danas dodatno imam')
        .map(item => item.name);

      setFilterGroups(updatedGroups);
    })
    .catch((err) => console.error('Greška kod dohvata sastojaka:', err));
}, []);


  useEffect(() => {
    const user = localStorage.getItem('loggedInUser')
    if (user) {
      const savedFilters = JSON.parse(localStorage.getItem('filtersByUser')) || {}
      savedFilters[user] = filterSelections
      localStorage.setItem('filtersByUser', JSON.stringify(savedFilters))
    }
  }, [filterSelections])

  const toggleFilter = (group, option) => {
    setFilterSelections(prev => {
      const currentGroup = prev[group] || []
      const exists = currentGroup.includes(option)
      return {
        ...prev,
        [group]: exists ? currentGroup.filter(o => o !== option) : [...currentGroup, option]
      }
    })
  }
  const removeFilterOption = async (groupIndex, optionToRemove) => {
    const updatedGroups = [...filterGroups];
    const groupName = updatedGroups[groupIndex].groupName;
  
    // Lokalno brisanje za "Danas dodatno imam"
    if (groupName === 'Danas dodatno imam') {
      updatedGroups[groupIndex].options = updatedGroups[groupIndex].options.filter(opt => opt !== optionToRemove);
      setFilterGroups(updatedGroups);
      setFilterSelections(prev => ({
        ...prev,
        [groupName]: (prev[groupName] || []).filter(opt => opt !== optionToRemove)
      }));
      return;
    }
  
    const token = localStorage.getItem('accessToken');
    if (!token) return alert("Nisi prijavljen!");
  
    try {
      const response = await fetch(`http://localhost:8000/pantry/by-name/${encodeURIComponent(optionToRemove)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      ;
  
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Greška pri brisanju.");
      }
  
      updatedGroups[groupIndex].options = updatedGroups[groupIndex].options.filter(
        opt => opt !== optionToRemove
      );
      setFilterGroups(updatedGroups);
  
      setFilterSelections(prev => ({
        ...prev,
        [groupName]: (prev[groupName] || []).filter(opt => opt !== optionToRemove)
      }));
  
      const user = localStorage.getItem('loggedInUser');
      if (user) {
        const allGroups = JSON.parse(localStorage.getItem('filterGroupsByUser')) || {};
        allGroups[user] = updatedGroups;
        localStorage.setItem('filterGroupsByUser', JSON.stringify(allGroups));
      }
    } catch (err) {
      alert("Greška: " + err.message);
    }
  };
  
  
  


  const handleAddCustomFilter = async (groupIndex) => {
    const group = filterGroups[groupIndex];
    const value = (newFilterValues[group.groupName] || '').trim();
  
    if (!value || group.options.includes(value)) return;
  
    if (group.groupName === 'Danas dodatno imam') {
      const updatedGroups = [...filterGroups];
      updatedGroups[groupIndex].options.push(value);
      setFilterGroups(updatedGroups);
      setNewFilterValues(prev => ({ ...prev, [group.groupName]: '' }));
      toggleFilter(group.groupName, value);
      return;
    }
  
    const token = localStorage.getItem('accessToken');
    if (!token) return alert("Nisi prijavljen!");
  
    try {
      const response = await fetch("http://localhost:8000/pantry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category: group.groupName,
          name: value
        })
      });
  
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Greška pri dodavanju.");
      }
  
      const updatedGroups = [...filterGroups];
      updatedGroups[groupIndex].options.push(value);
      setFilterGroups(updatedGroups);
      setNewFilterValues(prev => ({ ...prev, [group.groupName]: '' }));
      toggleFilter(group.groupName, value);
    } catch (err) {
      alert("Greška: " + err.message);
    }
  };
  


  const handleRecipeSearch = () => {
    const filters = Object.entries(filterSelections)
      .map(([group, options]) => `${group}: ${options.join(', ')}`)
      .join('\n')
  
    const prompt = `Želim recepte za ${numberOfPeople} osoba.\nVrijeme pripreme: do ${prepTime} minuta.\nMoji filteri:\n${filters}\nNapiši mi 5 prijedloga recepata.`
  
    console.log("Prompt za AI:", prompt)
    setCurrentStep(4) 
  }
  

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
        <div className="progress-bar" style={{ width: `${(currentStep / 4) * 100}%` }}></div>
      </div>

      <div className="pantry-section filter-section">

 {/* STEP 0: Kod kuće uvijek imam */}
{currentStep === 0 && (
  <div className="filter-group">
    <strong>{filterGroups[0].groupName}</strong>

    {/* Prazna poruka ako nema sastojaka */}
    {filterGroups[0].options.length === 0 && (
      <div className="empty-hint">
        <p>Ovdje možete dodati stavke koje uvijek imate kod kuće.</p>
        <p>Možete ih i obrisati kasnije ako se nešto promijeni.</p>
      </div>
    )}

    {/* Popis stavki */}
    <div className="filter-options pantry-tags" style={{ flexWrap: 'wrap', gap: '0.5rem', display: 'flex' }}>
  {filterGroups[0].options.map((opt) => (
    <Tag
      key={opt}
      closable
      onClose={(e) => {
        e.preventDefault()
        removeFilterOption(0, opt)
      }}
    >
      {opt}
    </Tag>
  ))}
</div>




    {/* Dodavanje novog sastojka */}
<div className="filter-actions">
  <div className="add-custom-filter">
    <input
      type="text"
      placeholder="Dodaj sastojak..."
      value={newFilterValues[filterGroups[0].groupName] || ''}
      onChange={(e) =>
        setNewFilterValues({ ...newFilterValues, [filterGroups[0].groupName]: e.target.value })
      }
    />
    <button className="button-add-circle" onClick={() => handleAddCustomFilter(0)}>+</button>
  </div>
  <div className="navigation-buttons" style={{ justifyContent: 'space-between' }}>
  <button
    className="button-orange"
    onClick={() => {
      const hasOptions = filterGroups[0].options.length > 0
      if (hasOptions) {
        setValidationMessage('')
        setFilterSelections(prev => ({
          ...prev,
          [filterGroups[0].groupName]: [...filterGroups[0].options]
        }))
        setCurrentStep(1)
      } else {
        setValidationMessage('Unesi barem jedan sastojak da bi nastavio dalje.')
      }
    }}
  >
    Sljedeće
  </button>
</div>
</div>

    {validationMessage && (
      <div className="validation-message">
        {validationMessage}
      </div>
    )}
  </div>
)}


{/* STEP 1: Dozvoljen način pripreme */}
{currentStep === 1 && (
  <div className="filter-group">
    <strong>{filterGroups[1].groupName}</strong>
    <div className="filter-options preparation-options">
  {filterGroups[1].options.map((opt) => (
    <div key={opt} className="option">
      <label>
        <input
          type="checkbox"
          checked={filterSelections[filterGroups[1].groupName]?.includes(opt) || false}
          onChange={() => toggleFilter(filterGroups[1].groupName, opt)}
        />
        {opt}
      </label>
    </div>
  ))}
</div>


    <div className="navigation-buttons" style={{ justifyContent: 'space-between' }}>
      <button
        className="button-orange"
        onClick={() => {
          setValidationMessage('')
          setCurrentStep(0)
        }}
      >
        Natrag
      </button>

      <button
        className="button-orange"
        onClick={() => {
          const hasSelection = (filterSelections[filterGroups[1].groupName]?.length || 0) > 0
          if (hasSelection) {
            setValidationMessage('')
            setCurrentStep(2)
          } else {
            setValidationMessage('Odaberi barem jedan način pripreme da bi nastavio dalje.')
          }
        }}
      >
        Sljedeće
      </button>
    </div>

    {validationMessage && (
      <div className="validation-message">
        {validationMessage}
      </div>
    )}
  </div>
)}

{/* STEP 2: Danas dodatno imam */}
{currentStep === 2 && (
  <div className="filter-group">
    <strong>{filterGroups[2].groupName}</strong>

    {/* Tip dana */}
    <div className="daily-tip">
   <em>{dailyTip}</em>
</div>


    {/* Prazna poruka */}
    {filterGroups[2].options.length === 0 && (
      <div className="empty-hint">
        <p>Dodaj sastojke koje danas dodatno imaš kod kuće.</p>
      </div>
    )}

    {/* Popis sastojaka */}
   {/* Popis sastojaka kao Tagovi */}
<div className="filter-options pantry-tags" style={{ flexWrap: 'wrap', gap: '0.5rem', display: 'flex' }}>
  {filterGroups[2].options.map((opt) => (
    <Tag
      key={opt}
      closable
      onClose={(e) => {
        e.preventDefault()
        removeFilterOption(2, opt)
      }}
    >
      {opt}
    </Tag>
  ))}
</div>


    {/* Dodavanje novog */}
    <div className="add-custom-filter">
      <input
        type="text"
        placeholder="Dodaj novi sastojak..."
        value={newFilterValues[filterGroups[2].groupName] || ''}
        onChange={(e) =>
          setNewFilterValues({ ...newFilterValues, [filterGroups[2].groupName]: e.target.value })
        }
      />
      <button className="button-add-circle" onClick={() => handleAddCustomFilter(2)}>+</button>
    </div>

    <div className="navigation-buttons" style={{ justifyContent: 'space-between' }}>
      <button className="button-orange" onClick={() => setCurrentStep(1)}>Natrag</button>
      <button className="button-orange" onClick={() => setCurrentStep(3)}>Sljedeće</button>
    </div>
  </div>
)}




{/* STEP 3: Detalji pripreme */}
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
    onChange={(e) => setNumberOfPeople(parseInt(e.target.value))}
  />
  <span>osoba</span>
</div>


    <div className="cooking-param">
      <label htmlFor="prepTime">Vrijeme pripreme: {prepTime} min</label>
      <input
        id="prepTime"
        type="range"
        min="5"
        max="120"
        step="5"
        value={prepTime}
        onChange={(e) => setPrepTime(parseInt(e.target.value))}
      />
    </div>

    <div className="navigation-buttons" style={{ justifyContent: 'space-between' }}>
      <button className="button-orange" onClick={() => setCurrentStep(2)}>Natrag</button>
      <button className="button-orange" onClick={handleRecipeSearch}>
        Prikaz sažetka
      </button>
    </div>
  </div>
)}

{/* STEP 4: Pregled odabira */}
{currentStep === 4 && (
  <div className="filter-group">
    <strong>Tvoj pregled prije kuhanja</strong>

    <div style={{ marginTop: '1rem' }}>
      <h4>Kod kuće uvijek imam:</h4>
      <ul>
        {(filterSelections['Kod kuće uvijek imam'] || []).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {(filterSelections['Danas dodatno imam'] || []).length > 0 && (
        <>
          <h4>Danas dodatno imam:</h4>
          <ul>
            {filterSelections['Danas dodatno imam'].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </>
      )}

      <h4>Način pripreme:</h4>
      <ul>
        {(filterSelections['Dozvoljen način pripreme'] || []).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h4>Broj osoba i vrijeme pripreme:</h4>
      <p>
        Kuham za <strong>{numberOfPeople}</strong> osoba, vrijeme pripreme do <strong>{prepTime} minuta</strong>.
      </p>
    </div>

    <div className="navigation-buttons" style={{ justifyContent: 'space-between', marginTop: '2rem' }}>
      <button className="button-orange" onClick={() => setCurrentStep(3)}>
        Natrag
      </button>
      <button
  className="button-orange"
  onClick={() => {
    alert('Kuhanje započeto!');
    setFilterGroups(prev =>
      prev.map((group, index) =>
        index === 2 ? { ...group, options: [] } : group
      )
    );    
    setCurrentStep(0);
    setFilterSelections({});
    setNewFilterValues({});
    setNumberOfPeople(1);
    setPrepTime(20);
  }}
>
  Idemo kuhati!
</button>

    </div>
  </div>
)}



      </div>
    </div>
  )
}

export default PantryPage
