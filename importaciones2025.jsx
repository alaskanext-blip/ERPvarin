import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  UploadCloud, DollarSign, Package, Activity, Filter, FileText, BarChart3, Globe 
} from 'lucide-react';

// Datos de demostración basados en el fragmento proporcionado
const defaultCSV = `Partida Aduanera;Descripcion de la Partida Aduanera;Aduana;Reg. Aduana;Fecha;Importador;Marca;Qty 1;Und 2;U$ FOB Tot;U$ Flete Tot;U$ CFR Tot;Seguro Tot;U$ Cif Tot;U$ FOB Und 1;U$ CFR Und 2;U$ CIF Und 2;Pais de Origen;Pais de Embarque;Via;Transporte;Incoterms;Descripcion Comercial;Producto
84145100;VENTILADORES DE MESA, PIE, PARED, CIELO RASO;SAN ANTONIO;22115391;19-01-25;COMERCIAL OMON LIMITADA;YIWU;4,00;PIEZAS;103,24;34,89;138,13;2,06;140,19;25,810;34,533;35,048;CHINA;CHINA;MARÍTIMO;EVERGREEN;FOB;VENTILADORES YIWU ELECTRICOS;VENTILADORES
84145100;VENTILADORES DE MESA, PIE, PARED, CIELO RASO;SAN ANTONIO;26339726;10-04-25;VESTAS CHILE SPA;VESTAS;25,00;PIEZAS;973,74;23,78;997,52;4,23;1001,75;38,949;0,000;0,000;DINAMARCA;DINAMARCA;MARÍTIMO;MAERSK LINE;CYS;VENTILADORES VESTAS 55M3/H;VENTILADORES
84145100;VENTILADORES DE MESA, PIE, PARED, CIELO RASO;SAN ANTONIO;26371545;15-04-25;RUCK VENTILATOREN GMBH;RUCK;50,00;PIEZAS;4017,14;178,29;4195,43;6,02;4201,45;80,342;0,000;0,000;ALEMANIA;ALEMANIA;MARÍTIMO;HAPAG LLOYD;EXW;VENTILADORES RUCK;VENTILADORES
84145100;VENTILADORES DE MESA, PIE, PARED, CIELO RASO;VALPARAISO;26371588;20-05-25;COMERCIAL OMON LIMITADA;YIWU;120,00;PIEZAS;3100,50;200,00;3300,50;15,00;3315,50;25,83;0,000;0,000;CHINA;CHINA;MARÍTIMO;MSC;FOB;VENTILADORES YIWU INDUSTRIAL;VENTILADORES
84145100;VENTILADORES DE MESA, PIE, PARED, CIELO RASO;IQUIQUE;26371900;05-06-25;IMPORTADORA DEL NORTE;LG;200,00;PIEZAS;8500,00;450,00;8950,00;50,00;9000,00;42,50;0,000;0,000;COREA DEL SUR;COREA DEL SUR;MARÍTIMO;COSCO;CIF;VENTILADORES LG;VENTILADORES`;

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export default function App() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para filtros
  const [filters, setFilters] = useState({
    importador: 'Todos',
    marca: 'Todas',
    pais: 'Todos'
  });

  // Opciones únicas para los selectores de filtros
  const [filterOptions, setFilterOptions] = useState({
    importadores: [],
    marcas: [],
    paises: []
  });

  // Función para parsear números con formato chileno (ej: 4.017,14 -> 4017.14)
  const parseNumber = (val) => {
    if (!val || val.trim() === '') return 0;
    let cleanVal = val.replace(/\./g, '').replace(',', '.');
    let num = parseFloat(cleanVal);
    return isNaN(num) ? 0 : num;
  };

  // Función para parsear el CSV
  const processCSV = (csvText) => {
    try {
      const lines = csvText.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) return [];

      const headers = lines[0].split(';').map(h => h.trim());
      const parsedData = [];

      for (let i = 1; i < lines.length; i++) {
        // Manejar correctamente posibles puntos y comas dentro de comillas (básico)
        const values = lines[i].split(';'); 
        
        if (values.length >= 20) { // Validar longitud mínima
          const row = {};
          headers.forEach((header, index) => {
            if (index < values.length) {
              row[header] = values[index] ? values[index].trim() : '';
            }
          });

          // Convertir campos numéricos clave
          row['Qty_Num'] = parseNumber(row['Qty 1']);
          row['FOB_Unit_Num'] = parseNumber(row['U$ FOB Und 1']);
          row['FOB_Num'] = parseNumber(row['U$ FOB Tot']);
          
          // Formatear fecha para agrupación (Asume formato DD-MM-YY)
          if (row['Fecha']) {
            const parts = row['Fecha'].split('-');
            if (parts.length === 3) {
              // Convertir a YYYY-MM para ordenamiento
              const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
              row['Mes_Anio'] = `${year}-${parts[1]}`; 
              
              // Extraer solo el mes para la tabla de datos
              const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
              const mesIndex = parseInt(parts[1], 10) - 1;
              row['Mes_Tabla'] = !isNaN(mesIndex) && mesIndex >= 0 && mesIndex < 12 ? meses[mesIndex] : parts[1];
            } else {
              row['Mes_Anio'] = 'Desconocido';
              row['Mes_Tabla'] = '-';
            }
          }

          parsedData.push(row);
        }
      }
      return parsedData;
    } catch (err) {
      console.error("Error parseando CSV:", err);
      return [];
    }
  };

  // Cargar datos por defecto al inicio
  useEffect(() => {
    const initialData = processCSV(defaultCSV);
    setData(initialData);
    setFilteredData(initialData);
    extractFilterOptions(initialData);
    setLoading(false);
  }, []);

  // Extraer opciones únicas para los filtros
  const extractFilterOptions = (dataset) => {
    const imp = [...new Set(dataset.map(item => item['Importador']).filter(Boolean))].sort();
    const mar = [...new Set(dataset.map(item => item['Marca']).filter(Boolean))].sort();
    const pai = [...new Set(dataset.map(item => item['Pais de Origen']).filter(Boolean))].sort();
    
    setFilterOptions({
      importadores: imp,
      marcas: mar,
      paises: pai
    });
  };

  // Manejar subida de archivo
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        const newData = processCSV(text);
        setData(newData);
        setFilteredData(newData);
        extractFilterOptions(newData);
        // Reset filtros
        setFilters({ importador: 'Todos', marca: 'Todas', pais: 'Todos' });
        setLoading(false);
      };
      reader.readAsText(file, 'ISO-8859-1'); // ISO-8859-1 suele funcionar mejor para CSV de aduanas latinas
    }
  };

  // Aplicar filtros
  useEffect(() => {
    let result = [...data];
    
    if (filters.importador !== 'Todos') {
      result = result.filter(item => item['Importador'] === filters.importador);
    }
    if (filters.marca !== 'Todas') {
      result = result.filter(item => item['Marca'] === filters.marca);
    }
    if (filters.pais !== 'Todos') {
      result = result.filter(item => item['Pais de Origen'] === filters.pais);
    }
    
    // Ordenar de mayor a menor cantidad
    result.sort((a, b) => (b.Qty_Num || 0) - (a.Qty_Num || 0));
    
    setFilteredData(result);
  }, [filters, data]);

  // --- CÁLCULO DE KPIs Y DATOS PARA GRÁFICOS ---
  
  const kpis = useMemo(() => {
    let totalFOB = 0;
    let totalQty = 0;

    filteredData.forEach(item => {
      totalFOB += item.FOB_Num || 0;
      totalQty += item.Qty_Num || 0;
    });

    return {
      fob: totalFOB,
      qty: totalQty,
      count: filteredData.length,
      avgFob: totalQty > 0 ? totalFOB / totalQty : 0
    };
  }, [filteredData]);

  // Agrupar datos genérico
  const groupBy = (array, key, valueKey) => {
    return array.reduce((acc, item) => {
      const group = item[key] || 'Desconocido';
      const val = item[valueKey] || 0;
      acc[group] = (acc[group] || 0) + val;
      return acc;
    }, {});
  };

  // Datos para gráficos
  const chartData = useMemo(() => {
    // 1. Top Importadores por FOB
    const impFOB = groupBy(filteredData, 'Importador', 'FOB_Num');
    const topImportadores = Object.keys(impFOB)
      .map(key => ({ name: key.substring(0, 20) + (key.length>20?'...':''), FOB: impFOB[key] }))
      .sort((a, b) => b.FOB - a.FOB)
      .slice(0, 5); // Top 5

    // 2. Marcas por Cantidad
    const marcaQty = groupBy(filteredData, 'Marca', 'Qty_Num');
    const topMarcas = Object.keys(marcaQty)
      .map(key => ({ name: key, Cantidad: marcaQty[key] }))
      .sort((a, b) => b.Cantidad - a.Cantidad)
      .slice(0, 5);

    // 3. Costo Promedio FOB por Marca
    const marcasStats = {};
    filteredData.forEach(item => {
      const m = item['Marca'] || 'Desconocido';
      if (!marcasStats[m]) marcasStats[m] = { fob: 0, qty: 0 };
      marcasStats[m].fob += item.FOB_Num || 0;
      marcasStats[m].qty += item.Qty_Num || 0;
    });
    
    const marcasAvgMap = {};
    const avgMarcasData = Object.keys(marcasStats).map(key => {
      const prom = marcasStats[key].qty > 0 ? marcasStats[key].fob / marcasStats[key].qty : 0;
      marcasAvgMap[key] = prom;
      return { name: key, Promedio: prom };
    }).sort((a, b) => b.Promedio - a.Promedio).slice(0, 10);

    // 4. Tendencia Mensual
    const mensualFOB = groupBy(filteredData, 'Mes_Anio', 'FOB_Num');
    
    const tendencia = Object.keys(mensualFOB).sort().map(key => ({
      mes: key,
      FOB: mensualFOB[key]
    }));

    return { topImportadores, topMarcas, avgMarcasData, marcasAvgMap, tendencia };
  }, [filteredData]);

  // Formateador de moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  };
  
  const formatNumber = (value) => {
    return new Intl.NumberFormat('es-CL').format(value);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-slate-500 font-semibold">Cargando datos...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Dashboard de Importaciones</h1>
          <p className="text-slate-500 mt-1">Análisis interactivo de Ventiladores - Chile 2025</p>
        </div>
        
        <div className="relative">
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            title="Sube tu archivo CSV"
          />
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg shadow-sm transition-colors font-medium">
            <UploadCloud size={20} />
            Cargar CSV Completo
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-6 items-center">
        <div className="flex items-center gap-2 text-slate-700 font-semibold w-full md:w-auto">
          <Filter size={18} /> Filtros:
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1 font-medium">Importador</label>
            <select 
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none"
              value={filters.importador}
              onChange={(e) => setFilters({...filters, importador: e.target.value})}
            >
              <option value="Todos">Todos los Importadores</option>
              {filterOptions.importadores.map(imp => <option key={imp} value={imp}>{imp}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1 font-medium">Marca</label>
            <select 
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none"
              value={filters.marca}
              onChange={(e) => setFilters({...filters, marca: e.target.value})}
            >
              <option value="Todas">Todas las Marcas</option>
              {filterOptions.marcas.map(marca => <option key={marca} value={marca}>{marca}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1 font-medium">País de Origen</label>
            <select 
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 outline-none"
              value={filters.pais}
              onChange={(e) => setFilters({...filters, pais: e.target.value})}
            >
              <option value="Todos">Todos los Países</option>
              {filterOptions.paises.map(pais => <option key={pais} value={pais}>{pais}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 border-l-4 border-l-green-500">
          <div className="bg-green-50 p-3 rounded-full text-green-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total FOB (USD)</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(kpis.fob)}</h3>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 border-l-4 border-l-emerald-500">
          <div className="bg-emerald-50 p-3 rounded-full text-emerald-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">FOB Unitario Prom.</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(kpis.avgFob)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 border-l-4 border-l-amber-500">
          <div className="bg-amber-50 p-3 rounded-full text-amber-600">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Volumen (Unidades)</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatNumber(kpis.qty)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4 border-l-4 border-l-purple-500">
          <div className="bg-purple-50 p-3 rounded-full text-purple-600">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Registros (Despachos)</p>
            <h3 className="text-2xl font-bold text-slate-800">{formatNumber(kpis.count)}</h3>
          </div>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Gráfico Barras - Importadores */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6 text-slate-800 font-semibold">
            <BarChart3 size={20} className="text-green-500"/> Top 5 Importadores (por FOB)
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.topImportadores} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tickFormatter={(val) => `$${val/1000}k`} stroke="#64748b" fontSize={12}/>
                <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={120} />
                <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="FOB" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Pie - Marcas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6 text-slate-800 font-semibold">
            <Package size={20} className="text-amber-500"/> Top Marcas (por Cantidad)
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.topMarcas}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="Cantidad"
                  label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {chartData.topMarcas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(value) + ' uds'} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Barras - Costo Promedio por Marca */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6 text-slate-800 font-semibold">
            <DollarSign size={20} className="text-emerald-500"/> Costo Promedio (U$ FOB Unid1) por Marca
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.avgMarcasData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis tickFormatter={(val) => `$${val}`} stroke="#64748b" fontSize={12} />
                <Tooltip cursor={{fill: '#f1f5f9'}} formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="Promedio" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Líneas - Tendencia Mensual */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-6 text-slate-800 font-semibold">
            <Activity size={20} className="text-purple-500"/> Tendencia de Importaciones (FOB)
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData.tendencia} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" stroke="#64748b" fontSize={12} />
                <YAxis tickFormatter={(val) => `$${val/1000}k`} stroke="#64748b" fontSize={12} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Line type="monotone" dataKey="FOB" stroke="#10b981" activeDot={{ r: 8 }} strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TABLA DE DATOS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <FileText size={20} className="text-slate-500"/> Vista Previa de Datos Registrados
          </div>
          <span className="text-sm text-slate-500">Mostrando {filteredData.length} registros</span>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="w-full text-sm text-left text-slate-500 relative">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3">Mes</th>
                <th className="px-6 py-3">Importador</th>
                <th className="px-6 py-3">Marca</th>
                <th className="px-6 py-3">Origen</th>
                <th className="px-6 py-3 text-right">Cantidad</th>
                <th className="px-6 py-3 text-right">FOB Fila</th>
                <th className="px-6 py-3 text-right">Promedio Marca</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, i) => (
                <tr key={i} className="bg-white border-b hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{row['Mes_Tabla'] || row['Fecha']}</td>
                  <td className="px-6 py-4">{row['Importador']}</td>
                  <td className="px-6 py-4">{row['Marca'] || '-'}</td>
                  <td className="px-6 py-4">{row['Pais de Origen']}</td>
                  <td className="px-6 py-4 text-right font-medium">{formatNumber(row['Qty_Num'])}</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-600">{formatCurrency(row['FOB_Unit_Num'])}</td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-600">{formatCurrency(chartData.marcasAvgMap[row['Marca']] || 0)}</td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-500">
                    No se encontraron registros que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
