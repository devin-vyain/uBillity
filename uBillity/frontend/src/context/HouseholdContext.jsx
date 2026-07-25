import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const HouseholdContext = createContext(null);

export function HouseholdProvider({ children }) {
    const [households, setHouseholds] = useState([]);
    const [currentHouseholdId, setCurrentHouseholdId] = useState(
        localStorage.getItem('currentHouseholdId') || null
    );

    const fetchHouseholds = async () => {
        const res = await api.get('households/');
        setHouseholds(res.data);
        setCurrentHouseholdId(prev => {
            if (prev && res.data.some(h => String(h.id) === String(prev))) return prev;
            const def = res.data.find(h => h.is_default) || res.data[0];
            if (def) localStorage.setItem('currentHouseholdId', def.id);
            return def ? def.id : null;
        });
    };

    useEffect(() => { fetchHouseholds(); }, []);

    const switchHousehold = (id) => {
        setCurrentHouseholdId(id);
        localStorage.setItem('currentHouseholdId', id);
    };

    const inviteToHousehold = (id, username) => api.post(`households/${id}/invite/`, { username });
    const setDefaultHousehold = async (id) => {
        await api.post(`households/${id}/set_default/`);
        fetchHouseholds();
    };

    const renameHousehold = async (id, name) => {
        await api.patch(`households/${id}/`, { name });
        fetchHouseholds();
    };

    return (
        <HouseholdContext.Provider value={{
            households, currentHouseholdId, switchHousehold, setDefaultHousehold,
            inviteToHousehold, renameHousehold, refreshHouseholds: fetchHouseholds,
        }}>
            {children}
        </HouseholdContext.Provider>
    );
}

export const useHousehold = () => useContext(HouseholdContext);