import { useEffect, useState } from 'react';
import AstroChart from '@astrodraw/astrochart';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select, { SingleValue } from 'react-select';
import axios from 'axios';
import './App.css';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}


interface OptionType {
  value: string;
  label: string;
}

interface Planet {
  planetName: string;
  planetLongitude: number;
}

interface Cusp {
  cuspLongitude: number;
}

interface InterestZone {
  name: string;
  angle: number;
}

interface BirthChart {
  planets: Planet[];
  cuspides: Cusp[];
  interestZone: InterestZone[];
}

interface TransitAspect {
  planetName2: string;
  longitude: number;
}

interface TransitData {
  transitAspects: TransitAspect[];
  cuspides: Cusp[];
}

const GEO_NAMES_USERNAME = 'marcalcantarageo';
const API_URL = '/ephemeris/calculateBirthChart';
const TRANSIT_API_URL = '/ephemeris/transitCalculation';

function App() {
  const [name, setName] = useState<string>('');
  const [birthdate, setBirthdate] = useState<Date>(new Date());
  const [transitTime, setTransitTime] = useState<Date>(new Date());
  const [country, setCountry] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [countryOptions, setCountryOptions] = useState<OptionType[]>([]);
  const [cityOptions, setCityOptions] = useState<OptionType[]>([]);
  const [lat, setLat] = useState<number | null>(null);
  const [long, setLong] = useState<number | null>(null);
  const [utcOffset, setUtcOffset] = useState<number | null>(null);
  const [showForm, setShowForm] = useState<boolean>(true);
  const [gptResponse, setGptResponse] = useState<string>('');
  const [gptLoading, setGptLoading] = useState<boolean>(false);

  const formatLocalDateTime = (date: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await axios.get(`http://api.geonames.org/countryInfoJSON?username=${GEO_NAMES_USERNAME}`);
        const countries = response.data.geonames.map((country: any) => ({
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
          const cities = response.data.geonames.map((city: any) => ({
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
          setLat(parseFloat(cityData.lat));
          setLong(parseFloat(cityData.lng));

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

  const isFormValid = name && birthdate && country && city && lat !== null && long !== null;

  const mapPlanetName = (planetName: string) => {
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

  const renderAstroChart = (birthChart: BirthChart, transitData: TransitData | null = null) => {
    const paper = document.getElementById('paper');
    if (paper) {
      while (paper.firstChild) {
        paper.removeChild(paper.firstChild);
      }
    }

    const chartSize = Math.min(window.innerWidth * 0.9, 800);
    const scaleFactor = window.innerWidth < 600 ? 0.6 : 1; // Dynamic scaling for mobile
    const marginValue = window.innerWidth < 600 ? 50 : 100; // Adjust margin for small screens

    const planetsData: Record<string, number[]> = {};
    birthChart.planets.forEach((planet) => {
      const astroName = mapPlanetName(planet.planetName);
      planetsData[astroName] = [planet.planetLongitude];
    });

    const cuspidesData = birthChart.cuspides.map(cusp => cusp.cuspLongitude);

    const chart = new AstroChart('paper', chartSize, chartSize, {
      MARGIN: marginValue,
      SYMBOL_SCALE: scaleFactor,
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

    birthChart.interestZone.forEach((zone) => {
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
      const transitPlanets: Record<string, number[]> = {};
      transitData.transitAspects.forEach((aspect) => {
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
  const callChatGPT = async (birthChart: BirthChart, transitData: TransitData) => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
    
    setGptLoading(true);

    const messages = [
      {
        role: "system",
        content: "Você é um especialista em astrologia. Interprete mapas astrais e trânsitos de forma clara e detalhada.",
      },
      {
        role: "user",
        content: `Aqui estão os dados do mapa astral: ${JSON.stringify(birthChart)}, na interpretação do mapa astral decorra casa a casa, e faça uam interpretação uma a uma. Depois, decorra sobre todos os aspectos um a um fazendo interpretação textual. Depois disso fazer uma conclusão final. Aqui estão os dados do trânsito: ${JSON.stringify(transitData)}. Em relação aos trânsitos, descrever uma a um e dar sua interpretação de cada, destacando o período (data inicial e final) e fazer um texto de conclusão sobre seu momento atual em base a isso.`,
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

    // Google Analytics Event Tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', 'click', {
        event_category: 'Button',
        event_label: 'Generate Map',
      });
    }

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

  const formatGPTResponse = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
  
    return lines.map((line, idx) => {
      if (line.startsWith('###')) {
        // Replace title with planet/star emoji
        return (
          <h2 key={idx} style={{
            color: '#673AB7',
            fontWeight: 'bold',
            fontFamily: 'Georgia, serif',
            marginTop: '30px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <span style={{ marginRight: '10px' }}>✨</span>
            {line.replace('###', '').trim()}
          </h2>
        );
      } else if (line.startsWith('**')) {
        // Use custom astrology bullet (like ♈, ♉, etc.)
        return (
          <li key={idx} style={{
            marginLeft: '24px',
            color: '#333',
            fontFamily: 'Georgia, serif',
            lineHeight: '1.8',
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ marginRight: '10px', fontSize: '18px' }}>🔮</span>
            {line.replace(/\*\*/g, '').trim()}
          </li>
        );
      } else {
        return (
          <p key={idx} style={{
            marginBottom: '12px',
            color: '#444',
            fontFamily: 'Georgia, serif',
            lineHeight: '1.8'
          }}>
            {line}
          </p>
        );
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
          <DatePicker
            selected={birthdate}
            onChange={(date: Date | null) => date && setBirthdate(date)}
            showTimeSelect
            dateFormat="yyyy-MM-dd'T'HH:mm:ss"
          />

          <label>Data do Trânsito:</label>
          <DatePicker
            selected={transitTime}
            onChange={(date: Date | null) => date && setTransitTime(date)}
            showTimeSelect
            dateFormat="yyyy-MM-dd'T'HH:mm:ss"
          />

          <label>País:</label>
          <Select<OptionType>
            options={countryOptions}
            value={countryOptions.find(option => option.value === country) || null}
            onChange={(option: SingleValue<OptionType>) => option && setCountry(option.value)}
          />

          <label>Cidade:</label>
          <Select<OptionType>
            options={cityOptions}
            value={cityOptions.find(option => option.value === city) || null}
            onChange={(option: SingleValue<OptionType>) => option && setCity(option.value)}
            isDisabled={!country}
          />

          <label>UTC Offset:</label>
          <input
            type="number"
            value={utcOffset ?? ''}
            onChange={(e) => setUtcOffset(parseFloat(e.target.value))}
          />
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

      <div id="paper"></div>

      <div className="gpt-interpretation">
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
