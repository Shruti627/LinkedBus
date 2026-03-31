// src/components/BusSearch.jsx
import React, { useState } from 'react';
import apiClient from '../api/apiClient';
// Optional icons (if you have Heroicons installed)
// import { CalendarIcon, MapPinIcon } from '@heroicons/react/24/solid'; 

const BusSearch = ({ onSearchSuccess }) => {
    const [source, setSource] = useState('');
    const [destination, setDestination] = useState('');
    const [date, setDate] = useState('');
    const [loading, setLoading] = useState(false);

    // Helper function: Get today's date in YYYY-MM-DD format
    const getTodayDate = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const handleSearch = async (e) => {
        e.preventDefault();

        if (!source || !destination || !date) {
            alert("Please select a Source, Destination, and Date.");
            return;
        }

        setLoading(true);
        try {
            const response = await apiClient.get('/bus/search', {
                params: { source, destination, date }
            });
            onSearchSuccess(response.data);
        } catch (error) {
            console.error('Bus search failed:', error.response?.data || error.message);
            alert('Error searching for buses. Please check if your backend is running.');
            onSearchSuccess([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSearch}
            className="
                flex flex-col md:flex-row
                bg-white rounded-xl shadow-lg border border-gray-100
                divide-y md:divide-y-0 md:divide-x divide-gray-200
                overflow-hidden
            "
        >
            {/* Input: Source */}
            <div className="flex-1 p-4 flex items-center min-w-[200px]">
                {/* <MapPinIcon className="w-6 h-6 text-red-500 mr-2" /> */}
                <input
                    type="text"
                    placeholder="Source City"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full text-lg font-semibold placeholder-gray-400 focus:outline-none"
                    required
                />
            </div>

            {/* Input: Destination */}
            <div className="flex-1 p-4 flex items-center min-w-[200px]">
                {/* <MapPinIcon className="w-6 h-6 text-red-500 mr-2" /> */}
                <input
                    type="text"
                    placeholder="Destination City"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full text-lg font-semibold placeholder-gray-400 focus:outline-none"
                    required
                />
            </div>

            {/* Input: Date */}
            <div className="flex-1 p-4 flex items-center min-w-[180px]">
                {/* <CalendarIcon className="w-6 h-6 text-red-500 mr-2" /> */}
                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={getTodayDate()}
                    className="w-full text-lg font-semibold text-gray-800 focus:outline-none"
                    required
                />
            </div>

            {/* Button: Search */}
            <button
                type="submit"
                disabled={loading}
                className="
                    w-full md:w-auto px-8 py-4
                    text-white font-extrabold text-xl
                    bg-red-600 hover:bg-red-700
                    transition duration-300
                    disabled:bg-red-400
                "
            >
                {loading ? 'SEARCHING...' : 'SEARCH'}
            </button>
        </form>
    );
};

export default BusSearch;
