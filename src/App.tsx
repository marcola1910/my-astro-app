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

interface TransitData {
  birthChart: BirthChart;
  transitAspects: TransitAspect[];
  cuspides: Cusp[];
}

interface TransitAspect {
  id: string;
  planetName1: string;
  planetName2: string;
  aspect: string;
  startDate: string | null;
  endDate: string | null;
  longitude: number;
  house: number;
}

interface Planet {
  id: string;
  planetName: string;
  planetLongitude: number;
  zodiacSign: string;
  house: number;
  cupangle: number;
  retrograde: boolean;
}

interface Cusp {
  house: number;
  cuspLongitude: number;
}

interface InterestZone {
  name: string;
  angle: number;
  zodiacsign: string;
}

interface FixedStar {
  starName: string;
  position: number;
  houseNumber: number;
}

interface BirthChart {
  planets: Planet[];
  aspects: any[];
  cuspides: Cusp[];
  interestZone: InterestZone[];
  fixedStars: FixedStar[];
}


const GEO_NAMES_USERNAME = 'marcalcantarageo';
const API_URL = '/api/ephemeris/calculateBirthChart';
const TRANSIT_API_URL = '/ephemeris/transitCalculation';

function App() {
  const [birthChart, setBirthChart] = useState<BirthChart | null>(null);
  const [autoGenerating, setAutoGenerating] = useState<boolean>(false);
  const [paramError, setParamError] = useState<string | null>(null);
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
  const [transitData, setTransitData] = useState<TransitData | null>(null);
  
  
  const formatLocalDateTime = (date: Date) => {
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await axios.get(`https://secure.geonames.org/countryInfoJSON?username=${GEO_NAMES_USERNAME}`);
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
          const response = await axios.get(`https://secure.geonames.org/searchJSON?country=${country}&maxRows=1000&username=${GEO_NAMES_USERNAME}`);
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
          const response = await axios.get(`https://secure.geonames.org/searchJSON?q=${city}&maxRows=1&username=${GEO_NAMES_USERNAME}`);
          const cityData = response.data.geonames[0];
          setLat(parseFloat(cityData.lat));
          setLong(parseFloat(cityData.lng));

          const timezoneResponse = await axios.get(`https://secure.geonames.org/timezoneJSON?lat=${cityData.lat}&lng=${cityData.lng}&username=${GEO_NAMES_USERNAME}`);
          const timezoneOffset = timezoneResponse.data.gmtOffset;
          setUtcOffset(timezoneOffset);
        } catch (error) {
          console.error('Erro ao buscar coordenadas:', error);
        }
      };
      fetchCityCoordinates();
    }
  }, [city, birthdate]);

  useEffect(() => {
    if (autoGenerating && name && birthdate && lat !== null && long !== null && utcOffset !== null) {
      handleSubmit();
    }
  }, [autoGenerating, name, birthdate, lat, long, utcOffset]);


  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const nome = searchParams.get('nome');
    const dataHoraNascimento = searchParams.get('birth');
    const latNascimento = searchParams.get('lat');
    const longNascimento = searchParams.get('long');
    const latAtual = searchParams.get('transitLat');
    const longAtual = searchParams.get('transitLong');
    const dataHoraTransito = searchParams.get('transit');
    const utcParam = searchParams.get('utc');

    const hasAllParams = nome && dataHoraNascimento && latNascimento && longNascimento &&
                        latAtual && longAtual && dataHoraTransito && utcParam;

    if (hasAllParams) {
      try {
        const parsedBirth = new Date(dataHoraNascimento!);
        const parsedTransit = new Date(dataHoraTransito!);
        const parsedLat = parseFloat(latNascimento!);
        const parsedLong = parseFloat(longNascimento!);
        const parsedUtc = parseFloat(utcParam!);

        if (isNaN(parsedLat) || isNaN(parsedLong) || isNaN(parsedUtc)) {
          throw new Error("Coordenadas ou UTC inválidos.");
        }

        setName(nome!);
        setBirthdate(parsedBirth);
        setLat(parsedLat);
        setLong(parsedLong);
        setTransitTime(parsedTransit);
        setUtcOffset(parsedUtc);
        setShowForm(false);
        setAutoGenerating(true);

        setTimeout(() => {
          handleSubmit();
        }, 150);
        
      } catch (err: any) {
        setParamError("Erro ao interpretar os parâmetros da URL: " + err.message);
      }
      } else if (
        nome || dataHoraNascimento || latNascimento || longNascimento ||
        latAtual || longAtual || dataHoraTransito || utcParam
      ) {
        setParamError("Parâmetros incompletos na URL. Por favor, forneça todos os dados.");
      }
    }, []
  );

  const isFormValid =
  name &&
  birthdate &&
  lat !== null &&
  long !== null &&
  utcOffset !== null &&
  (country && city || autoGenerating);

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
    const scaleFactor = window.innerWidth < 600 ? 0.6 : 1;
    const marginValue = window.innerWidth < 600 ? 50 : 100;

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
        content: "Você é um especialista em astrologia. Interprete mapas astrais e trânsitos de forma clara e detalhada. A estrutura do texto deve ser: Parte 1 - Fale o Sol, a Lua e o Asc da pessoa; Parte 2 - Falar sobre as 12 casas do birthchart da pessoa, uma a uma, se existe algum planeta na casa interpretar sua influência; Parte 3 - Falar sobre os aspectos do birthchart da pessoa, uma a um; Parte 4- Falar sobre os interestZones da pessoa e interpretar cada um no mapa da pessoa; Parte 5 - Falar sobre os aspectos de trânsito, interpretar cada um e no final uma conclusão conextualizada deles. ; Parte 6 - Conclusão sobre o mapa da pessoa e um outro paragrafo conclusão do trânsito dessa pesssoa. ",
      },
      {
        role: "user",
        content: `Aqui estão os dados do mapa astral: ${JSON.stringify(birthChart)}, Aqui estão os dados do trânsito: ${JSON.stringify(transitData)}.`,
      },
    ];

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4-turbo',
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
    if (!isFormValid && !autoGenerating) return;

    setGptResponse('');

    if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
      window.gtag('event', 'click', {
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
      setBirthChart(response.data); 
      const transitRequest = {
        dateTime: formatLocalDateTime(transitTime),
        birthChart: response.data,
      };
      const transitResponse = await axios.post(TRANSIT_API_URL, transitRequest);
      
      renderAstroChart(response.data, transitResponse.data);
      setTransitData(transitResponse.data);

      await callChatGPT(transitResponse.data.birthChart, transitResponse.data);
    } catch (error) {
      console.error('Erro ao gerar mapa ou trânsito:', error);
    }
  };

  const formatGPTResponse = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return lines.map((line, idx) => {
      if (line.startsWith('###')) {
        return (
          <h2 key={idx} style={{ color: '#673AB7', fontWeight: 'bold', fontFamily: 'Georgia, serif', marginTop: '30px', marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '10px' }}>✨</span>
            {line.replace('###', '').trim()}
          </h2>
        );
      } else if (line.startsWith('**')) {
        return (
          <li key={idx} style={{ marginLeft: '24px', color: '#333', fontFamily: 'Georgia, serif', lineHeight: '1.8', listStyle: 'none', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ marginRight: '10px', fontSize: '18px' }}>🔮</span>
            {line.replace(/\*\*/g, '').trim()}
          </li>
        );
      } else {
        return (
          <p key={idx} style={{ marginBottom: '12px', color: '#444', fontFamily: 'Georgia, serif', lineHeight: '1.8' }}>
            {line}
          </p>
        );
      }
    });
  };

  const renderTableSection = () => {
    if (!birthChart || !transitData) return null;

    const planets = birthChart.planets || [];
    const interestZones = birthChart.interestZone || [];
    const transitAspects = transitData.transitAspects || [];
    const fixedStars = birthChart.fixedStars || [];

    return (
      <div className="astro-tables-container">
        {/* Planetas */}
        <h3 className="table-title">🪐 Planetas</h3>
        <table className="astro-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Longitude</th>
              <th>Casa</th>
              <th>Signo</th>
            </tr>
          </thead>
          <tbody>
            {planets.map((p: any, idx: number) => (
              <tr key={idx}>
                <td>{p.planetName}</td>
                <td>{p.planetLongitude?.toFixed(2)}°</td>
                <td>{p.house}</td>
                <td>{p.zodiacSign}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pontos de Interesse */}
        <h3 className="table-title">📍 Pontos de Interesse</h3>
        <table className="astro-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Ângulo (°)</th>
              <th>Signo</th>
            </tr>
          </thead>
          <tbody>
            {interestZones.map((zone: InterestZone, idx: number) => (
              <tr key={idx}>
                <td>{zone.name}</td>
                <td>{zone.angle?.toFixed(2)}</td>
                <td>{zone.zodiacsign}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Aspectos de Trânsito */}
        <h3 className="table-title">✨ Aspectos de Trânsito</h3>
        <table className="astro-table">
          <thead>
            <tr>
              <th>Planeta Natal</th>
              <th>Casa</th>
              <th>Aspecto</th>
              <th>Planeta Trânsito</th>
              <th>Longitude</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Duração</th>
            </tr>
          </thead>
          <tbody>
            {transitAspects.map((aspect: TransitAspect, idx: number) => {
              const start = aspect.startDate ? new Date(aspect.startDate) : null;
              const end = aspect.endDate ? new Date(aspect.endDate) : null;
              const duration = start && end
                ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24))
                : '-';
              return (
                <tr key={idx}>
                  <td>{aspect.planetName1}</td>
                  <td>{aspect.house}</td>
                  <td>{aspect.aspect}</td>
                  <td>{aspect.planetName2}</td>
                  <td>{aspect.longitude?.toFixed(2)}</td>
                  <td>{start ? start.toLocaleDateString() : '-'}</td>
                  <td>{end ? end.toLocaleDateString() : '-'}</td>
                  <td>{duration}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Estrelas Fixas */}
        {fixedStars.length > 0 && (
          <>
            <h3 className="table-title">🌟 Estrelas Fixas</h3>
            <table className="astro-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Longitude</th>
                  <th>Casa</th>
                </tr>
              </thead>
              <tbody>
                {fixedStars.map((star: any, idx: number) => (
                  <tr key={idx}>
                    <td>{star.starName}</td>
                    <td>{star.position?.toFixed(2)}°</td>
                    <td>{star.houseNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    );
  };
  
  return (
    <div className="App">
      {autoGenerating && (
          <p style={{ backgroundColor: '#e3f2fd', padding: '12px', borderRadius: '8px', color: '#0d47a1' }}>
            Gerando automaticamente com base nos parâmetros da URL...
          </p>
        )}

        {paramError && (
          <p style={{ backgroundColor: '#ffebee', padding: '12px', borderRadius: '8px', color: '#b71c1c' }}>
            ⚠️ {paramError}
          </p>
      )}
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

      {!autoGenerating && (
        <button
          disabled={!name || !birthdate || lat === null || long === null || utcOffset === null}
          onClick={handleSubmit}
          style={{
            backgroundColor: '#4CAF50',
            color: '#fff',
            padding: '10px 20px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
        >
          Gerar Mapa
        </button>
      )}
      

      <div id="paper"></div>
       
      <div className="gpt-interpretation">
        <h3 style={{ textAlign: 'center' }}>🪐 Interpretação Astrológica</h3>
          {gptLoading && <p>Interpretando mapa... ⏳</p>}
          {!gptLoading && gptResponse && (
            <div>{formatGPTResponse(gptResponse)}</div>
          )}
          {!gptLoading && !gptResponse && <p>Gere um mapa para ver a análise.</p>}
      </div>
      
      {/* Transit Aspect Table */}
      {transitData && transitData.transitAspects.length > 0 && (
        <div style={{ marginTop: '30px', maxWidth: '800px', margin: '0 auto' }}>
          
        </div>
      )}
      
      {/* Nova seção com tabelas detalhadas */}
      {renderTableSection()}

    </div>
  );
}

export default App;
