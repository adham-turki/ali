import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Clock, Edit2, Save, Plus, Minus, MapPin, RefreshCw } from 'lucide-react';

// Popular countries with their codes
const COUNTRIES = [
    { code: 'PS', name: 'فلسطين - Palestine', cities: ['Ramallah', 'Jerusalem', 'Gaza', 'Hebron', 'Nablus', 'Bethlehem'] },
    { code: 'SA', name: 'السعودية - Saudi Arabia', cities: ['Mecca', 'Medina', 'Riyadh', 'Jeddah', 'Dammam'] },
    { code: 'AE', name: 'الإمارات - UAE', cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'] },
    { code: 'EG', name: 'مصر - Egypt', cities: ['Cairo', 'Alexandria', 'Giza', 'Luxor'] },
    { code: 'JO', name: 'الأردن - Jordan', cities: ['Amman', 'Irbid', 'Zarqa', 'Aqaba'] },
    { code: 'LB', name: 'لبنان - Lebanon', cities: ['Beirut', 'Tripoli', 'Sidon', 'Tyre'] },
    { code: 'SY', name: 'سوريا - Syria', cities: ['Damascus', 'Aleppo', 'Homs', 'Latakia'] },
    { code: 'IQ', name: 'العراق - Iraq', cities: ['Baghdad', 'Basra', 'Mosul', 'Erbil'] },
    { code: 'KW', name: 'الكويت - Kuwait', cities: ['Kuwait City', 'Hawalli', 'Salmiya'] },
    { code: 'QA', name: 'قطر - Qatar', cities: ['Doha', 'Al Rayyan', 'Al Wakrah'] },
    { code: 'BH', name: 'البحرين - Bahrain', cities: ['Manama', 'Muharraq', 'Riffa'] },
    { code: 'OM', name: 'عمان - Oman', cities: ['Muscat', 'Salalah', 'Sohar'] },
    { code: 'YE', name: 'اليمن - Yemen', cities: ['Sanaa', 'Aden', 'Taiz'] },
    { code: 'MA', name: 'المغرب - Morocco', cities: ['Casablanca', 'Rabat', 'Marrakech', 'Fes'] },
    { code: 'DZ', name: 'الجزائر - Algeria', cities: ['Algiers', 'Oran', 'Constantine'] },
    { code: 'TN', name: 'تونس - Tunisia', cities: ['Tunis', 'Sfax', 'Sousse'] },
    { code: 'LY', name: 'ليبيا - Libya', cities: ['Tripoli', 'Benghazi', 'Misrata'] },
    { code: 'TR', name: 'تركيا - Turkey', cities: ['Istanbul', 'Ankara', 'Izmir', 'Bursa'] },
    { code: 'US', name: 'USA', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Detroit'] },
    { code: 'GB', name: 'UK', cities: ['London', 'Manchester', 'Birmingham', 'Leeds'] },
    { code: 'FR', name: 'France', cities: ['Paris', 'Marseille', 'Lyon', 'Toulouse'] },
    { code: 'DE', name: 'Germany', cities: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg'] },
    { code: 'MY', name: 'Malaysia', cities: ['Kuala Lumpur', 'Penang', 'Johor Bahru'] },
    { code: 'ID', name: 'Indonesia', cities: ['Jakarta', 'Surabaya', 'Bandung', 'Medan'] },
    { code: 'PK', name: 'Pakistan', cities: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi'] },
];

const formatDateDDMMYYYY = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}-${month}-${year}`;
};

const normalizeApiTime = (value) => {
    if (typeof value !== 'string') return '';
    const match = value.match(/(\d{1,2}:\d{2})/);
    if (!match) return value;
    const [h, m] = match[1].split(':');
    return `${String(Number(h)).padStart(2, '0')}:${m}`;
};

const addMinutesToTime = (time, minutes) => {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
};

const formatTime12Hour = (time24) => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
};

export default function PrayerTimes() {
    const [prayerTimes, setPrayerTimes] = useState({
        fajr: { adhan: '05:30', iqama: '05:45' },
        dhuhr: { adhan: '12:30', iqama: '12:45' },
        asr: { adhan: '15:45', iqama: '16:00' },
        maghrib: { adhan: '18:15', iqama: '18:20' },
        isha: { adhan: '19:45', iqama: '20:00' }
    });

    const [editMode, setEditMode] = useState({});
    const [bulkAdjust, setBulkAdjust] = useState(0);
    const [bulkAdjustTarget, setBulkAdjustTarget] = useState('both');
    const [selectedCountry, setSelectedCountry] = useState('PS');
    const [selectedCity, setSelectedCity] = useState('Ramallah');
    const [cities, setCities] = useState(() => {
        const country = COUNTRIES.find(c => c.code === 'PS');
        return country ? country.cities : [];
    });
    const [loading, setLoading] = useState(false);
    const [lastFetched, setLastFetched] = useState(null);
    const abortControllerRef = useRef(null);

    // Date/Time display state
    const [currentDateTime, setCurrentDateTime] = useState(() => {
        return new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Gaza',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    });
    const [isEditingDateTime, setIsEditingDateTime] = useState(false);
    const [customDateTime, setCustomDateTime] = useState({ date: '', time: '' });

    // Fetch prayer times from API
    const fetchPrayerTimes = useCallback(async () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        try {
            const dateStr = formatDateDDMMYYYY(new Date());
            const url = new URL(`https://api.aladhan.com/v1/timingsByCity/${dateStr}`);
            url.search = new URLSearchParams({
                city: selectedCity,
                country: selectedCountry,
                method: '2',
            }).toString();

            const response = await fetch(url.toString(), { signal: controller.signal });
            if (!response.ok) {
                throw new Error(`Prayer times request failed: HTTP ${response.status}`);
            }
            const data = await response.json();

            if (data.code === 200 && data.data.timings) {
                const timings = data.data.timings;

                // Calculate iqama times
                // fajr: +30, maghrib: +10, isha: +10, others: +15
                const calculateIqama = (adhanTime, prayerName) => {
                    const minutesByPrayer = {
                        fajr: 30,
                        maghrib: 10,
                        isha: 10,
                    };
                    const minutes = minutesByPrayer[prayerName] ?? 15;
                    return addMinutesToTime(adhanTime, minutes);
                };

                setPrayerTimes({
                    fajr: {
                        adhan: normalizeApiTime(timings.Fajr),
                        iqama: calculateIqama(normalizeApiTime(timings.Fajr), 'fajr')
                    },
                    dhuhr: {
                        adhan: normalizeApiTime(timings.Dhuhr),
                        iqama: calculateIqama(normalizeApiTime(timings.Dhuhr), 'dhuhr')
                    },
                    asr: {
                        adhan: normalizeApiTime(timings.Asr),
                        iqama: calculateIqama(normalizeApiTime(timings.Asr), 'asr')
                    },
                    maghrib: {
                        adhan: normalizeApiTime(timings.Maghrib),
                        iqama: calculateIqama(normalizeApiTime(timings.Maghrib), 'maghrib')
                    },
                    isha: {
                        adhan: normalizeApiTime(timings.Isha),
                        iqama: calculateIqama(normalizeApiTime(timings.Isha), 'isha')
                    }
                });

                setLastFetched(new Date().toLocaleString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: 'numeric',
                    month: 'long'
                }));
            }
        } catch (error) {
            if (error?.name === 'AbortError') {
                return;
            }
            console.error('Error fetching prayer times:', error);
            alert('حدث خطأ في جلب مواقيت الصلاة. الرجاء المحاولة مرة أخرى.');
        } finally {
            if (abortControllerRef.current === controller) {
                setLoading(false);
            }
        }
    }, [selectedCity, selectedCountry]);

    const handleCountryChange = (countryCode) => {
        const country = COUNTRIES.find(c => c.code === countryCode);
        const nextCities = country ? country.cities : [];
        const nextCity = nextCities[0] ?? '';

        setSelectedCountry(countryCode);
        setCities(nextCities);
        setSelectedCity(nextCity);
    };

    // Fetch prayer times on mount and when location changes
    useEffect(() => {
        fetchPrayerTimes();
    }, [fetchPrayerTimes]);

    // Update date/time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDateTime(new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Gaza',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Handle date/time editing
    const handleDateTimeClick = () => {
        const [dateStr, timeStr] = currentDateTime.split(', ');
        const [month, day, year] = dateStr.split('/');
        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        setCustomDateTime({ date: formattedDate, time: timeStr });
        setIsEditingDateTime(true);
    };

    const handleDateTimeSave = () => {
        const date = new Date(`${customDateTime.date}T${customDateTime.time}`);
        const formatted = date.toLocaleString('en-US', {
            timeZone: 'Asia/Gaza',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        setCurrentDateTime(formatted);
        setIsEditingDateTime(false);
    };

    const handleDateTimeCancel = () => {
        setIsEditingDateTime(false);
        setCustomDateTime({ date: '', time: '' });
    };

    const prayerNames = {
        fajr: 'الفجر',
        dhuhr: 'الظهر',
        asr: 'العصر',
        maghrib: 'المغرب',
        isha: 'العشاء'
    };

    const handleTimeChange = (prayer, type, value) => {
        setPrayerTimes(prev => ({
            ...prev,
            [prayer]: {
                ...prev[prayer],
                [type]: value
            }
        }));
    };

    const toggleEdit = (prayer, type) => {
        const key = `${prayer}-${type}`;
        setEditMode(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const applyBulkAdjustment = () => {
        if (bulkAdjust === 0) return;

        const newTimes = {};
        Object.keys(prayerTimes).forEach(prayer => {
            const current = prayerTimes[prayer];
            newTimes[prayer] = {
                adhan:
                    bulkAdjustTarget === 'adhan' || bulkAdjustTarget === 'both'
                        ? addMinutesToTime(current.adhan, bulkAdjust)
                        : current.adhan,
                iqama:
                    bulkAdjustTarget === 'iqama' || bulkAdjustTarget === 'both'
                        ? addMinutesToTime(current.iqama, bulkAdjust)
                        : current.iqama,
            };
        });

        setPrayerTimes(newTimes);
        setBulkAdjust(0);
    };

    const PrayerCard = ({ prayer, name }) => {
        const isAdhanEdit = editMode[`${prayer}-adhan`];
        const isIqamaEdit = editMode[`${prayer}-iqama`];

        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow border-r-4 border-emerald-500">
                <h3 className="text-2xl font-bold text-gray-800 mb-4 text-center">{name}</h3>

                <div className="space-y-4">
                    {/* Adhan Time */}
                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                        <span className="text-gray-700 font-semibold">الأذان:</span>
                        <div className="flex items-center gap-2">
                            {isAdhanEdit ? (
                                <input
                                    type="time"
                                    value={prayerTimes[prayer].adhan}
                                    onChange={(e) => handleTimeChange(prayer, 'adhan', e.target.value)}
                                    className="px-3 py-1 border-2 border-emerald-500 rounded-lg text-lg font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                />
                            ) : (
                                <span className="text-2xl font-bold text-emerald-700 font-mono">
                                    {formatTime12Hour(prayerTimes[prayer].adhan)}
                                </span>
                            )}
                            <button
                                onClick={() => toggleEdit(prayer, 'adhan')}
                                className="p-2 hover:bg-emerald-200 rounded-lg transition-colors"
                            >
                                {isAdhanEdit ? <Save size={18} className="text-emerald-600" /> : <Edit2 size={18} className="text-gray-600" />}
                            </button>
                        </div>
                    </div>

                    {/* Iqama Time */}
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <span className="text-gray-700 font-semibold">الإقامة:</span>
                        <div className="flex items-center gap-2">
                            {isIqamaEdit ? (
                                <input
                                    type="time"
                                    value={prayerTimes[prayer].iqama}
                                    onChange={(e) => handleTimeChange(prayer, 'iqama', e.target.value)}
                                    className="px-3 py-1 border-2 border-blue-500 rounded-lg text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            ) : (
                                <span className="text-2xl font-bold text-blue-700 font-mono">
                                    {formatTime12Hour(prayerTimes[prayer].iqama)}
                                </span>
                            )}
                            <button
                                onClick={() => toggleEdit(prayer, 'iqama')}
                                className="p-2 hover:bg-blue-200 rounded-lg transition-colors"
                            >
                                {isIqamaEdit ? <Save size={18} className="text-blue-600" /> : <Edit2 size={18} className="text-gray-600" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 p-8">
            {/* Date/Time Display */}
            <div className="fixed top-4 right-4 z-50" dir="ltr">
                <div className="bg-white rounded-lg shadow-lg p-3 border border-gray-200">
                    {isEditingDateTime ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customDateTime.date}
                                onChange={(e) => setCustomDateTime(prev => ({ ...prev, date: e.target.value }))}
                                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <input
                                type="time"
                                value={customDateTime.time}
                                onChange={(e) => setCustomDateTime(prev => ({ ...prev, time: e.target.value }))}
                                className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                            <button
                                onClick={handleDateTimeSave}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            >
                                <Save size={16} />
                            </button>
                            <button
                                onClick={handleDateTimeCancel}
                                className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <div
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded px-2 py-1"
                            onClick={handleDateTimeClick}
                        >
                            <Clock size={16} className="text-emerald-600" />
                            <span className="text-sm font-mono text-gray-700">
                                {currentDateTime}
                            </span>
                            <Edit2 size={14} className="text-gray-400" />
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Clock size={48} className="text-emerald-600" />
                        <h1 className="text-5xl font-bold text-gray-800">مواقيت الصلاة</h1>
                    </div>
                    <p className="text-gray-600 text-lg">Prayer Times</p>
                </div>

                {/* Location Selector */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="text-emerald-600" size={24} />
                        <h2 className="text-xl font-bold text-gray-800">اختر الموقع - Select Location</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">الدولة - Country</label>
                            <select
                                value={selectedCountry}
                                onChange={(e) => handleCountryChange(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg"
                            >
                                {COUNTRIES.map(country => (
                                    <option key={country.code} value={country.code}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">المدينة - City</label>
                            <select
                                value={selectedCity}
                                onChange={(e) => setSelectedCity(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg"
                            >
                                {cities.map(city => (
                                    <option key={city} value={city}>
                                        {city}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={fetchPrayerTimes}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-bold"
                            >
                                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                                <span>{loading ? 'جاري التحميل...' : 'تحديث الأوقات'}</span>
                            </button>
                        </div>
                    </div>

                    {lastFetched && (
                        <p className="text-sm text-gray-600 mt-4 text-center">
                            آخر تحديث: {lastFetched}
                        </p>
                    )}
                </div>

                {/* Bulk Adjustment Controls */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">تعديل جماعي للأوقات</h2>

                    <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setBulkAdjustTarget('adhan')}
                            className={`px-4 py-2 rounded-lg border-2 font-semibold transition-colors ${bulkAdjustTarget === 'adhan' ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            الأذان فقط
                        </button>
                        <button
                            type="button"
                            onClick={() => setBulkAdjustTarget('iqama')}
                            className={`px-4 py-2 rounded-lg border-2 font-semibold transition-colors ${bulkAdjustTarget === 'iqama' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            الإقامة فقط
                        </button>
                        <button
                            type="button"
                            onClick={() => setBulkAdjustTarget('both')}
                            className={`px-4 py-2 rounded-lg border-2 font-semibold transition-colors ${bulkAdjustTarget === 'both' ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}`}
                        >
                            الاثنين
                        </button>
                    </div>

                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        <button
                            onClick={() => setBulkAdjust(prev => prev - 5)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                            <Minus size={20} />
                            <span>5 دقائق</span>
                        </button>

                        <button
                            onClick={() => setBulkAdjust(prev => prev - 1)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-500 transition-colors"
                        >
                            <Minus size={20} />
                            <span>1 دقيقة</span>
                        </button>

                        <div className="px-6 py-2 bg-gray-100 rounded-lg">
                            <span className="text-2xl font-bold text-gray-800">{bulkAdjust > 0 ? '+' : ''}{bulkAdjust} دقيقة</span>
                        </div>

                        <button
                            onClick={() => setBulkAdjust(prev => prev + 1)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-400 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                        >
                            <Plus size={20} />
                            <span>1 دقيقة</span>
                        </button>

                        <button
                            onClick={() => setBulkAdjust(prev => prev + 5)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                            <Plus size={20} />
                            <span>5 دقائق</span>
                        </button>

                        <button
                            onClick={applyBulkAdjustment}
                            disabled={bulkAdjust === 0}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-bold"
                        >
                            <Save size={20} />
                            <span>تطبيق التعديل</span>
                        </button>
                    </div>
                </div>

                {/* Prayer Times Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.keys(prayerTimes).map(prayer => (
                        <PrayerCard
                            key={prayer}
                            prayer={prayer}
                            name={prayerNames[prayer]}
                        />
                    ))}
                </div>


            </div>
        </div>
    );
}