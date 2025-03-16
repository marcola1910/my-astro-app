import { useEffect, useState } from 'react';
import AstroChart from '@astrodraw/astrochart';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';
import axios from 'axios';
import './App.css';

const GEO_NAMES_USERNAME = 'marcalcantarageo';
const API_URL = '/ephemeris/calculateBirthChart';
const TRANSIT_API_URL = '/ephemeris/transitCalculation';

function App() {
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState(new Date());
  const [transitTime, setTransitTime] = useState(new Date());
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [countryOptions, setCountryOptions] = useState([]);
  const [cityOptions, setCityOptions] = useState([]);
  const [lat, setLat] = useState(null);
  const [long, setLong] = useState(null);
  const [utcOffset, setUtcOffset] = useState(null);
  const [showForm, setShowForm] = useState(true);
  const [gptResponse, setGptResponse] = useState('');
  const [gptLoading, setGptLoading] = useState(false);

  // --- Utility: format date in local ISO format ---
  const formatLocalDateTime = (date) => {
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await axios.get(`http://api.geonames.org/countryInfoJSON?username=${GEO_NAMES_USERNAME}`);
        const countries = response.data.geonames.map(country => ({
          value: country.countryCode,
          label: country.countryName,
        }));
        setCountryOptions(countries);
      } catch (error) {
        console.error('Erro ao buscar países:', error);
      }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    if (country) {
      const fetchCities = async () => {
        try {
          const response = await axios.get(`http://api.geonames.org/searchJSON?country=${country}&maxRows=50&username=${GEO_NAMES_USERNAME}`);
          const cities = response.data.geonames.map(city => ({
            value: city.name,
            label: city.name,
          }));
          setCityOptions(cities);
        } catch (error) {
          console.error('Erro ao buscar cidades:', error);
        }
      };
      fetchCities();
    }
  }, [country]);

  useEffect(() => {
    if (city) {
      const fetchCityCoordinates = async () => {
        try {
          const response = await axios.get(`http://api.geonames.org/searchJSON?q=${city}&maxRows=1&username=${GEO_NAMES_USERNAME}`);
          const cityData = response.data.geonames[0];
          setLat(cityData.lat);
          setLong(cityData.lng);

          const timezoneResponse = await axios.get(`http://api.geonames.org/timezoneJSON?lat=${cityData.lat}&lng=${cityData.lng}&username=${GEO_NAMES_USERNAME}`);
          const timezoneOffset = timezoneResponse.data.gmtOffset;
          setUtcOffset(timezoneOffset);
        } catch (error) {
          console.error('Erro ao buscar coordenadas:', error);
        }
      };
      fetchCityCoordinates();
    }
  }, [city, birthdate]);

  const isFormValid = name && birthdate && country && city && lat && long;

  const mapPlanetName = (planetName) => {
    switch (planetName) {
      case 'Sol': return 'Sun';
      case 'Lua': return 'Moon';
      case 'Mercúrio': return 'Mercury';
      case 'Vênus': return 'Venus';
      case 'Marte': return 'Mars';
      case 'Júpiter': return 'Jupiter';
      case 'Saturno': return 'Saturn';
      case 'Urano': return 'Uranus';
      case 'Netuno': return 'Neptune';
      case 'Plutão': return 'Pluto';
      case 'Nodo Norte': return 'NNode';
      case 'Lilith': return 'Lilith';
      case 'Quíron': return 'Chiron';
      default: return planetName;
    }
  };

  const renderAstroChart = (birthChart, transitData = null) => {
    document.getElementById('paper').innerHTML = '';

    const planetsData = {};
    birthChart.planets.forEach(planet => {
      const astroName = mapPlanetName(planet.planetName);
      planetsData[astroName] = [planet.planetLongitude];
    });

    const cuspidesData = birthChart.cuspides.map(cusp => cusp.cuspLongitude);

    const chart = new AstroChart('paper', 800, 800, {
      MARGIN: 100,
      SYMBOL_SCALE: 1,
      COLOR_ARIES: 'transparent',
      COLOR_TAURUS: 'transparent',
      COLOR_GEMINI: 'transparent',
      COLOR_CANCER: 'transparent',
      COLOR_LEO: 'transparent',
      COLOR_VIRGO: 'transparent',
      COLOR_LIBRA: 'transparent',
      COLOR_SCORPIO: 'transparent',
      COLOR_SAGITTARIUS: 'transparent',
      COLOR_CAPRICORN: 'transparent',
      COLOR_AQUARIUS: 'transparent',
      COLOR_PISCES: 'transparent',
    });

    const dataRadix = {
      planets: planetsData,
      cusps: cuspidesData,
    };

    const radix = chart.radix(dataRadix);

    birthChart.interestZone.forEach(zone => {
      let poiKey;
      switch (zone.name) {
        case 'ASC': poiKey = 'As'; break;
        case 'MC': poiKey = 'Mc'; break;
        case 'DSC': poiKey = 'Ds'; break;
        case 'LWM': poiKey = 'Ic'; break;
        default: poiKey = zone.name;
      }
      radix.addPointsOfInterest({ [poiKey]: [zone.angle] });
    });

    if (transitData) {
      const transitPlanets = {};
      transitData.transitAspects.forEach(aspect => {
        const astroName = mapPlanetName(aspect.planetName2);
        if (!transitPlanets[astroName]) {
          transitPlanets[astroName] = [aspect.longitude];
        }
      });

      const transitCusps = transitData.cuspides.map(cusp => cusp.cuspLongitude);

      const dataTransit = {
        planets: transitPlanets,
        cusps: transitCusps,
      };

      radix.transit(dataTransit);
    }
  };

  const callChatGPT = async (birthChart, transitData) => {
    const apiKey = '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';

    setGptLoading(true);

    const messages = [
      {
        role: "system",
        content: "Você é um especialista em astrologia. Interprete mapas astrais e trânsitos de forma clara e detalhada.",
      },
      {
        role: "user",
        content: `Aqui estão os dados do mapa astral, fale a interpretação de cada planeta e cada aspecto e pontos de interesse: ${JSON.stringify(birthChart)}. 
Aqui estão os dados do trânsito, fale em detalhes e explicite o período de duração: ${JSON.stringify(transitData)}. 
Forneça uma análise astrológica completa em português.`,
      },
    ];

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: messages,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      const reply = response.data.choices[0].message.content;
      setGptResponse(reply);
      setGptLoading(false);
    } catch (error) {
      console.error('Erro ao chamar ChatGPT:', error);
      setGptResponse('Erro ao obter interpretação.');
      setGptLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    setGptResponse('');

    const birthChartRequest = {
      birthday: formatLocalDateTime(birthdate),
      name: name,
      latPlace: lat,
      longPlace: long,
      utc: utcOffset,
    };

    try {
      const response = await axios.post(API_URL, birthChartRequest);
      const transitRequest = {
        dateTime: formatLocalDateTime(transitTime),
        birthChart: response.data,
      };
      const transitResponse = await axios.post(TRANSIT_API_URL, transitRequest);

      renderAstroChart(transitResponse.data.birthChart, transitResponse.data);

      await callChatGPT(transitResponse.data.birthChart, transitResponse.data);

    } catch (error) {
      console.error('Erro ao gerar mapa ou trânsito:', error);
    }
  };

  const formatGPTResponse = (text) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');

    return lines.map((line, idx) => {
      if (line.startsWith('###')) {
        return <h3 key={idx} style={{ color: '#4CAF50', marginTop: '20px' }}>{line.replace('###', '').trim()}</h3>;
      } else if (line.startsWith('**')) {
        return <li key={idx} style={{ marginLeft: '20px' }}>{line.replace(/\*\*/g, '').trim()}</li>;
      } else {
        return <p key={idx} style={{ marginBottom: '12px', lineHeight: '1.6' }}>{line}</p>;
      }
    });
  };

  return (
    <div className="App">
      <button
        onClick={() => setShowForm(!showForm)}
        style={{
          backgroundColor: '#2196F3',
          color: '#fff',
          padding: '8px 16px',
          fontSize: '14px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '10px',
        }}
      >
        {showForm ? 'Esconder Formulário' : 'Mostrar Formulário'}
      </button>

      {showForm && (
        <form className="astro-form" style={{ marginBottom: '20px' }}>
          <label>Nome:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />

          <label>Data e Hora de Nascimento:</label>
          <DatePicker selected={birthdate} onChange={(date) => setBirthdate(date)} showTimeSelect dateFormat="yyyy-MM-dd'T'HH:mm:ss" />

          <label>Data do Trânsito:</label>
          <DatePicker selected={transitTime} onChange={(date) => setTransitTime(date)} showTimeSelect dateFormat="yyyy-MM-dd'T'HH:mm:ss" />

          <label>País:</label>
          <Select options={countryOptions} value={countryOptions.find(option => option.value === country)} onChange={(option) => setCountry(option.value)} />

          <label>Cidade:</label>
          <Select options={cityOptions} value={cityOptions.find(option => option.value === city)} onChange={(option) => setCity(option.value)} isDisabled={!country} />

          <label>UTC Offset:</label>
          <input type="number" value={utcOffset} onChange={(e) => setUtcOffset(e.target.value)} />
        </form>
      )}

      <button
        disabled={!isFormValid}
        onClick={handleSubmit}
        style={{
          backgroundColor: isFormValid ? '#4CAF50' : '#ddd',
          color: '#fff',
          padding: '10px 20px',
          fontSize: '16px',
          border: 'none',
          borderRadius: '6px',
          cursor: isFormValid ? 'pointer' : 'not-allowed',
          marginBottom: '20px',
        }}
      >
        Gerar Mapa
      </button>

      <div id="paper" style={{ width: '800px', height: '800px', margin: '0 auto' }}></div>

      <div style={{ marginTop: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '8px', minHeight: '150px', maxWidth: '800px', marginLeft: 'auto', marginRight: 'auto' }}>
        <h3 style={{ textAlign: 'center' }}>🪐 Interpretação Astrológica</h3>
        {gptLoading && <p>Interpretando mapa... ⏳</p>}
        {!gptLoading && gptResponse && (
          <div>{formatGPTResponse(gptResponse)}</div>
        )}
        {!gptLoading && !gptResponse && <p>Gere um mapa para ver a análise.</p>}
      </div>
    </div>
  );
}

export default App;
