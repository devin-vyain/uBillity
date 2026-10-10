import React, { useEffect, useState, useRef, useMemo } from 'react';
import api from './api';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import { format, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import moment from 'moment';
import { useAuth } from './context/AuthContext';
import LoginPage from './LoginPage';
import { HouseholdProvider, useHousehold } from './context/HouseholdContext';

//Add a comment to create a new commit so we can overwrite main-dev in Github ;o

// Move NetTotalChart out of the main component and memoize it so
// it doesn't re-render on unrelated parent updates (like typing in the form).
const NetTotalChart = React.memo(({ data }) => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const INTERVAL_DAYS = 7; // set your desired fixed interval here

    const ticks = useMemo(() => {
        if (!data.length) return [];
        const first = data[0].dateValue;
        const last = data[data.length - 1].dateValue;
        const result = [];
        for (let t = first; t <= last; t += INTERVAL_DAYS * DAY_MS) {
            result.push(t);
        }
        return result;
    }, [data]);

    return (
        <div className='d-flex p-2' style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data}>
                    <CartesianGrid stroke="#ccc" />
                    <XAxis
                        dataKey="dateValue"
                        type="number"
                        scale="time"
                        domain={['dataMin', 'dataMax']}
                        ticks={ticks}
                        tickFormatter={(ts) =>
                            new Date(ts).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                            })
                        }
                    />
                    <YAxis
                        tickFormatter={(value) =>
                            new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                maximumFractionDigits: 0,
                            }).format(value)
                        }
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (!active || !payload || !payload.length) return null;

                            const { balance, delta, transactions } = payload[0].payload;

                            const date = new Date(label).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                            });

                            const formattedBalance = new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                            }).format(balance);

                            const formattedDelta = new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                signDisplay: 'always',
                            }).format(delta);

                            return (
                                <div style={{ background: 'white', border: '1px solid #ccc', padding: 8, maxWidth: 260 }}>
                                    {/* Date + Balance section */}
                                    <div style={{ marginBottom: 6 }}>
                                        <div style={{ fontWeight: 'bold', color: '#4caf50' }}>{date}</div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                            <b>Balance:</b> {formattedBalance}
                                        </div>
                                    </div>

                                    {/* Transactions section */}
                                    {transactions && transactions.length > 0 && (
                                        <div style={{ marginTop: 6, borderTop: '1px solid #eee', paddingTop: 6 }}>
                                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Transactions:</div>
                                            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                                {transactions.map(tx => {
                                                    const isPositive = tx.type === 'income' || tx.type === 'asset';
                                                    const sign = isPositive ? '+' : '-';
                                                    const formattedAmt = new Intl.NumberFormat('en-US', {
                                                        style: 'currency',
                                                        currency: 'USD',
                                                    }).format(tx.amount);
                                                    return (
                                                        <li
                                                            key={tx.id}
                                                            style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}
                                                        >
                                                            <span>{tx.name}</span>
                                                            <span style={{ color: isPositive ? '#2e7d32' : '#c62828' }}>
                                                                {sign}{formattedAmt}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>

                                            {/* Net Total — sum of all transactions above, amount colored by sign */}
                                            <div
                                                style={{
                                                    marginTop: 6,
                                                    borderTop: '1px solid #eee',
                                                    paddingTop: 6,
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    gap: 8,
                                                    fontWeight: 'bold',
                                                }}
                                            >
                                                <span>Daily Change:</span>
                                                <span style={{ color: delta >= 0 ? '#2e7d32' : '#c62828' }}>
                                                    {formattedDelta}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        }}
                    />
                    <Line type="monotone" dataKey="balance" stroke="#4caf50" strokeWidth={3} dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
});

const CostBreakdownChart = React.memo(({ data, groupBy }) => {
    const chartData = useMemo(() => {
        if (!data || !data.length) return [];

        const grouped = data.reduce((acc, entry) => {
            const key = groupBy === 'type' ? entry.type : entry.category;
            const label = groupBy === 'type' ? getTypeLabel(key) : getCategoryLabel(key);
            const nextKey = label || key || 'Uncategorized';

            if (!acc[nextKey]) {
                acc[nextKey] = 0;
            }

            acc[nextKey] += Number(entry.amount || 0);
            return acc;
        }, {});

        return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }, [data, groupBy]);

    const totalValue = useMemo(() => chartData.reduce((sum, entry) => sum + Number(entry.value || 0), 0), [chartData]);
    const COLORS = ['#0d6efd', '#198754', '#fd7e14', '#dc3545', '#6c757d', '#20c997', '#e83e8c', '#6610f2'];
    const groupLabel = groupBy === 'type' ? 'Type' : 'Category';

    return (
        <div className="chart-card pie-chart-card" style={{ position: 'relative', width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                    <Tooltip
                        formatter={(value, name, props) => {
                            const entry = props.payload;
                            const groupName = entry?.name || name || 'N/A';
                            const numericValue = Number(value || 0);
                            const formattedValue = new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                maximumFractionDigits: 0,
                            }).format(numericValue);
                            const percent = totalValue > 0 ? ((numericValue / totalValue) * 100).toFixed(0) : '0';
                            return [`${groupName}: ${formattedValue} (${percent}%)`];
                        }}
                        labelFormatter={(value) => value}
                    />
                    <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={42}
                        outerRadius={82}
                        paddingAngle={2}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={true}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
});

// Extracted EditForm to top-level so it keeps a stable identity across renders.
const EditForm = ({ editForm, setEditForm, editSeries, setEditSeries, editError, handleUpdate }) => {
    const amountRef = useRef(null);
    const editDueDateRef = useRef(null);

    return (
        <form id="edit-bill-form" onSubmit={handleUpdate}>
            {editError && (
                <div className="alert alert-danger" role="alert" aria-live="polite">
                    {editError}
                </div>
            )}
            {/* Name */}
            <div className="mb-3">
                <label htmlFor="editName" className="form-label">Name</label>
                <input
                    type="text"
                    className="form-control"
                    id="editName"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
            </div>

            {/* Description */}
            <div className="mb-3">
                <label htmlFor="editDescription" className="form-label">Description</label>
                <input
                    type="text"
                    className="form-control"
                    id="editDescription"
                    value={editForm.description || ''}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
            </div>

            {/* Amount */}
            <div className="mb-3">
                <label htmlFor="editAmount" className="form-label">Amount</label>
                <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    id="editAmount"
                    ref={amountRef}
                    value={editForm.amount || ''}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                />
            </div>

            {/* Type */}
            <div className="mb-3">
                <label htmlFor="editType" className="form-label">Type</label>
                <select
                    className="form-select"
                    id="editType"
                    value={editForm.type || ''}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                >
                    <option value="">Select type</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                </select>
            </div>

            {/* Due Date */}
            <div className="mb-3">
                <label htmlFor="editDueDate" className="form-label">Due Date</label>
                <div style={{ position: 'relative' }}>
                    <input
                        type="date"
                        className="form-control"
                        id="editDueDate"
                        value={editForm.due_date || ''}
                        onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                        ref={editDueDateRef}
                        style={{ paddingRight: '36px' }}
                    />
                    <i
                        className="bi bi-calendar3"
                        title="Open date picker"
                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6c757d' }}
                        onClick={() => {
                            if (editDueDateRef.current) {
                                try { editDueDateRef.current.showPicker?.(); } catch (e) { editDueDateRef.current.focus(); }
                                editDueDateRef.current.focus();
                            }
                        }}
                    />
                </div>
            </div>

            {/* Recurrence (series checkbox) */}
            {editForm.recurrence_id && (
                <div className="form-check mt-3">
                    <input
                        type="checkbox"
                        className="form-check-input"
                        id="editSeriesCheckbox"
                        checked={editSeries}
                        onChange={(e) => setEditSeries(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="editSeriesCheckbox">
                        Apply changes to entire series
                    </label>
                </div>
            )}
        </form>
    );
};


const debug = true

const TRANSACTION_TYPES = [
    { value: '', label: '-- Select Type --' },
    { value: 'asset', label: 'Asset' },
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
    { value: 'liability', label: 'Liability' },
];

const TRANSACTION_CATEGORIES = [
    { value: '', label: '-- Select Category --' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'investment', label: 'Investment' },
    { value: 'loan', label: 'Loan' },
    { value: 'misc', label: 'Miscellaneous' },
    { value: 'recreation', label: 'Recreation' },
    { value: 'subscription', label: 'Subscription' },
    { value: 'utility', label: 'Utility' },
];

const getTypeLabel = (value) => {
    const match = TRANSACTION_TYPES.find(t => t.value === value);
    return match ? match.label : value;
};

const getCategoryLabel = (value) => {
    const match = TRANSACTION_CATEGORIES.find(t => t.value === value);
    return match ? match.label : value;
};

export default function BillApp() {
    return (
        <HouseholdProvider>
            <BillAppContent />
        </HouseholdProvider>
    );
}

function BillAppContent() {
    const { token, logout } = useAuth();
    const { households, currentHouseholdId, switchHousehold, inviteToHousehold, renameHousehold } = useHousehold();

    if (!token) {
        return <LoginPage />;
    }

    const [showRenameModal, setShowRenameModal] = useState(false);
    const [householdToRename, setHouseholdToRename] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    const openRenameModal = (household) => {
        setHouseholdToRename(household);
        setRenameValue(household.name);
        setShowRenameModal(true);
        setShowHouseholdMenu(false); // close the dropdown so the modal isn't hidden behind it
    };

    const handleRenameSubmit = async (e) => {
        e.preventDefault();
        if (!renameValue.trim() || !householdToRename) return;
        try {
            await renameHousehold(householdToRename.id, renameValue.trim());
            setShowRenameModal(false);
            setHouseholdToRename(null);
        } catch (err) {
            alert(err.response?.data?.detail || 'You can only rename your default household.');
        }
    };

    const [showKPIs, setShowKPIs] = useState(true);
    const [showForm, setShowForm] = useState(true);
    const [showList, setShowList] = useState(true);

    const [deletedBill, setDeletedBill] = useState(null);
    const toastTimeout = useRef(null);
    const [toast, setToast] = useState(null);

    const [bills, setBills] = useState([]);
    const [sortField, setSortField] = useState('due_date');
    const [sortAsc, setSortAsc] = useState(true);
    const [pieChartGroupBy, setPieChartGroupBy] = useState('type');

    const [form, setForm] = useState({
        name: '', description: '', amount: '', type: '', category: '',
        due_date: '', reconciled: '', recurrence: 'none', household: '',
    });

    const [showReconciled, setShowReconciled] = useState(false);
    const [showFiltersPanel, setShowFiltersPanel] = useState(true);
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const handleToggleReconciled = async (bill) => {
        if (!bill || typeof bill !== 'object' || !bill.id) {
            console.error('Invalid bill object passed:', bill);
            return;
        }

        try {
            const updatedReconciled = !bill.reconciled;

            await api.patch(`bills/${bill.id}/`, {
                reconciled: updatedReconciled,
            });

            setBills((prevBills) =>
                prevBills.map((b) =>
                    b.id === bill.id ? { ...b, reconciled: updatedReconciled } : b
                )
            );
        } catch (error) {
            console.error('Failed to update reconciled status:', error);
        }
    };

    const now = moment();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const addDueDateRef = useRef(null);
    const startDateRef = useRef(null);
    const endDateRef = useRef(null);

    const formatLocalDate = (date) => {
        const year = date.getFullYear();
        const month = `${date.getMonth() + 1}`.padStart(2, '0');
        const day = `${date.getDate()}`.padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const setDateRange = (daysAhead) => {
        const now = new Date();
        const future = new Date();
        future.setDate(now.getDate() + daysAhead);

        const todayStr = formatLocalDate(now);
        const futureStr = formatLocalDate(future);

        setStartDate(todayStr);
        setEndDate(futureStr);
    };

    const filterUntilNextIncome = () => {
        const now = new Date();
        const todayStr = formatLocalDate(now);

        const upcomingIncome = bills
            .filter(b => b.type === 'income' && !b.reconciled && new Date(b.due_date) >= new Date())
            .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

        if (upcomingIncome) {
            setStartDate(todayStr);
            setEndDate(upcomingIncome.due_date);
        }
    };

    const clearFilter = () => {
        debug && console.log("Clearing date filters!")
        setStartDate('');
        setEndDate('');
        setSelectedTypeFilter('');
        setSelectedCategoryFilter('');
        setSearchTerm('');
    };

    const getSortValue = (bill, field) => {
        switch (field) {
            case 'amount':
                return Number(bill.amount) || 0;
            case 'date_added':
                return Number(bill.id) || 0;
            case 'due_date':
            default:
                return new Date(bill.due_date).getTime();
        }
    };

    const sortedBills = [...bills].sort((a, b) => {
        const aVal = getSortValue(a, sortField);
        const bVal = getSortValue(b, sortField);
        return sortAsc ? aVal - bVal : bVal - aVal;
    });

    const filteredByDate = sortedBills.filter(bill => {
        const billDate = new Date(bill.due_date);
        const afterStart = !startDate || new Date(startDate) <= billDate;
        const beforeEnd = !endDate || billDate <= new Date(endDate);
        return afterStart && beforeEnd;
    });

    const filteredBySearchAndMeta = filteredByDate.filter(bill => {
        const matchesType = !selectedTypeFilter || bill.type === selectedTypeFilter;
        const matchesCategory = !selectedCategoryFilter || bill.category === selectedCategoryFilter;
        const query = searchTerm.trim().toLowerCase();
        const searchableText = [
            bill.name || '',
            bill.description || '',
            getTypeLabel(bill.type),
            getCategoryLabel(bill.category),
        ].join(' ').toLowerCase();
        const matchesSearch = !query || searchableText.includes(query);

        return matchesType && matchesCategory && matchesSearch;
    });

    const pieChartSource = useMemo(() => {
        return showReconciled ? filteredBySearchAndMeta : filteredBySearchAndMeta.filter(bill => !bill.reconciled);
    }, [filteredBySearchAndMeta, showReconciled]);

    // Always apply the date filter; when reconciled bills are hidden,
    // filter the already date-filtered list by reconciled status.
    const displayedBills = showReconciled
        ? filteredBySearchAndMeta
        : filteredBySearchAndMeta.filter(bill => !bill.reconciled);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [billToDelete, setBillToDelete] = useState(null);
    const [deleteSeries, setDeleteSeries] = useState(false);

    const fetchBills = async () => {
        const params = currentHouseholdId ? { household: currentHouseholdId } : {};
        const res = await api.get('bills/', { params });
        setBills(res.data);
    };

    useEffect(() => {
        if (currentHouseholdId) fetchBills();
    }, [currentHouseholdId]);

    const getTypeBadgeClass = (type) => {
        switch (type) {
            case 'income':
                return 'bg-success text-white';
            case 'liability':
                return 'bg-danger text-white';
            case 'asset':
                return 'bg-info text-dark';
            case 'expense':
                return 'bg-secondary text-white';
            default:
                return 'bg-warning text-dark'; // fallback
        }
    };

    const getCategoryBadgeClass = (category) => {
        switch (category) {
            case 'miscellaneous':
                return 'bg-light text-info';
            case 'utility':
                return 'bg-light text-primary';
            case 'healthcare':
                return 'bg-light text-primary';
            case 'recreation':
                return 'bg-light text-success';
            case 'subscription':
                return 'bg-light text-danger';
            case 'loan':
                return 'bg-light text-danger';
            default:
                return 'bg-light text-dark'; // fallback
        }
    };
    //Logs for filteredByDate array
    // debug && console.log('filteredByDate:', filteredByDate);

    const totalLiability = filteredByDate
        .filter(bill => bill.type === 'liability')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);

    const totalIncome = filteredByDate
        .filter(bill => bill.type === 'income')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);

    //Assets are not currently removed from KPIs when they are reconciled
    //Assets should be handled outside of this CRUD paradigm, probably
    const totalAsset = filteredByDate
        .filter(bill => bill.type === 'asset')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);

    const totalExpense = filteredByDate
        .filter(bill => bill.type === 'expense')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);

    const netTotal = totalAsset + totalIncome - totalLiability - totalExpense
    // Compute running net total data for the chart.
    // IMPORTANT: Always exclude reconciled bills from the forecast/chart.
    // Memoized so it only recomputes when the filtered bills actually change.
    const runningNetTotalData = useMemo(() => {
        const netTotalByDate = {};

        const billsForChart = filteredByDate.filter(b => !b.reconciled);

        billsForChart.forEach(bill => {
            const dateKey = bill.due_date;
            const amount = parseFloat(bill.amount) || 0;

            if (!netTotalByDate[dateKey]) {
                netTotalByDate[dateKey] = { net: 0, transactions: [] };
            }

            switch (bill.type) {
                case 'asset':
                case 'income':
                    netTotalByDate[dateKey].net += amount;
                    break;
                case 'expense':
                case 'liability':
                    netTotalByDate[dateKey].net -= amount;
                    break;
            }

            // Keep the bill details so the tooltip can list every transaction on this date
            netTotalByDate[dateKey].transactions.push({
                id: bill.id,
                name: bill.name,
                amount,
                type: bill.type,
            });
        });

        const netTotalDataLocal = Object.entries(netTotalByDate)
            .map(([date, { net, transactions }]) => ({
                date,
                dateValue: new Date(date + 'T00:00:00').getTime(),
                net,
                transactions,
            }))
            .sort((a, b) => a.dateValue - b.dateValue);

        let cumulative = 0;
        return netTotalDataLocal.map(entry => {
            cumulative += entry.net;
            return {
                date: entry.date,
                dateValue: entry.dateValue,
                balance: cumulative,
                delta: entry.net,
                transactions: entry.transactions, // carried through for the tooltip
            };
        });
    }, [filteredByDate]);

    const lastBalance = runningNetTotalData.length > 0
        ? runningNetTotalData[runningNetTotalData.length - 1].balance
        : netTotal;

    const displayDateRangeText = (!startDate && !endDate)
        ? 'Showing all dates'
        : `Showing dates ${startDate ? new Date(startDate).toLocaleDateString('en-US') : ''}${startDate && endDate ? ' - ' : ''}${endDate ? new Date(endDate).toLocaleDateString('en-US') : ''}`;

    const handleChange = e => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [editSeries, setEditSeries] = useState(false);
    const [editError, setEditError] = useState('');

    const handleEdit = (bill) => {
        setEditForm(bill);
        setEditSeries(false);
        setEditError('');
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e?.preventDefault();
        setEditError('');
        try {
            const url = editSeries
                ? `bills/series/${editForm.recurrence_id}/`
                : `bills/${editForm.id}/`;

            await api.put(url, editForm);
            fetchBills();
            setShowEditModal(false);
        } catch (error) {
            const responseData = error.response?.data;
            setEditError(
                responseData?.detail ||
                (responseData ? JSON.stringify(responseData) : error.message) ||
                'The bill could not be updated.'
            );
        }
    };

    const [showHouseholdMenu, setShowHouseholdMenu] = useState(false);
    const householdMenuRef = useRef(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteUsername, setInviteUsername] = useState('');
    const [inviteError, setInviteError] = useState('');
    const [inviteSuccess, setInviteSuccess] = useState('');

    // Close the household menu when clicking outside it
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (householdMenuRef.current && !householdMenuRef.current.contains(e.target)) {
                setShowHouseholdMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDelete = (bill) => {
        setBillToDelete(bill);
        setDeleteSeries(false); // reset every time
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!billToDelete) return;

        try {
            await api.delete(`bills/${billToDelete.id}/?delete_series=${deleteSeries}`);

            setBills((prevBills) =>
                deleteSeries && billToDelete.recurrence_id
                    ? prevBills.filter(b => b.recurrence_id !== billToDelete.recurrence_id)
                    : prevBills.filter(b => b.id !== billToDelete.id)
            );
        } catch (err) {
            console.error("Failed to delete:", err);
        } finally {
            setShowDeleteModal(false);
            setBillToDelete(null);
            setDeleteSeries(false);
        }
    };

    const handleUndo = () => {
        if (toast?.bill) {
            setBills(prev => [toast.bill, ...prev]);
        }
        setToast(null);

        // Cancel the actual delete
        if (toastTimeout.current) {
            clearTimeout(toastTimeout.current);
            toastTimeout.current = null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const cleanedForm = {
            ...form,
            amount: parseFloat(form.amount),
            description: form.description.trim() || null,
            type: form.type || null,
            category: form.category || null,
            due_date: form.due_date || null,
            reconciled: false,
            recurrence: form.recurrence || null,
            household: form.household || currentHouseholdId,
        };

        try {
            debug && console.log('Recurrence value submitting:', form.recurrence);
            await api.post('bills/', cleanedForm);
            setForm({
                name: '',
                description: '',
                amount: '',
                type: '',
                category: '',
                due_date: '',
                reconciled: '',
                recurrence: '',
            });
            fetchBills();
        } catch (error) {
            console.error('Failed to submit bill:', error.response?.data || error.message);
            // Optionally show error feedback to the user here
        }
    };

    const openInviteModal = () => {
        setInviteUsername('');
        setInviteError('');
        setInviteSuccess('');
        setShowInviteModal(true);
        setShowHouseholdMenu(false); // close the dropdown so the modal isn't hidden behind it
    };

    const handleInviteSubmit = async (e) => {
        e.preventDefault();
        if (!inviteUsername.trim()) return;
        setInviteError('');
        setInviteSuccess('');
        try {
            await inviteToHousehold(currentHouseholdId, inviteUsername.trim());
            setInviteSuccess(`${inviteUsername.trim()} added to the household.`);
            setInviteUsername('');
        } catch (err) {
            setInviteError(err.response?.data?.detail || 'Failed to invite user.');
        }
    };

    return (
        <>
            {/* Page menu bar header */}
            <div className="row mb-4">
                <div className="toggle-toolbar bg-dark">
                    <div className="d-flex justify-content-between align-items-center flex-wrap">
                        {/* Left-aligned title */}
                        <h2 className="mb-0 ms-2 text-white">uBillity</h2>

                        {/* Right-aligned buttons */}
                        <div className="d-flex gap-2 mb-0 me-4">
                            <button
                                title="Show/hide KPIs"
                                className={`btn btn-sm ${showKPIs ? 'btn-primary' : 'btn-outline-light'}`}
                                onClick={() => setShowKPIs(prev => !prev)}
                            >
                                <i className="bi bi-bar-chart-fill"></i>
                            </button>
                            <button
                                title="Show/hide new record form"
                                className={`btn btn-sm ${showForm ? 'btn-primary' : 'btn-outline-light'}`}
                                onClick={() => setShowForm(prev => !prev)}
                            >
                                <i className="bi bi-database-add"></i>
                            </button>
                            <button
                                title="Show/hide list"
                                className={`btn btn-sm me-3 ${showList ? 'btn-primary' : 'btn-outline-light'}`}
                                onClick={() => setShowList(prev => !prev)}
                            >
                                <i className="bi bi-card-list"></i>
                            </button>
                            <div className="position-relative" ref={householdMenuRef}>
                                <button
                                    title="Switch household"
                                    className={`btn btn-sm ${showHouseholdMenu ? 'btn-primary' : 'btn-outline-light'}`}
                                    onClick={() => setShowHouseholdMenu(prev => !prev)}
                                >
                                    <i className="bi bi-house-door-fill"></i>
                                </button>

                                {showHouseholdMenu && (
                                    <div
                                        className="position-absolute end-0 mt-2 p-3 bg-white border rounded shadow-sm text-dark"
                                        style={{ minWidth: '240px', zIndex: 10000 }}
                                    >
                                        <div className="mb-2 fw-bold">Households</div>

                                        <div className="d-flex flex-column gap-1 mb-3">
                                            {households.map(h => (
                                                <div key={h.id} className="d-flex align-items-center gap-1">
                                                    <button
                                                        className={`btn btn-sm text-start flex-grow-1 ${String(h.id) === String(currentHouseholdId) ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                        onClick={() => {
                                                            switchHousehold(h.id);
                                                            setShowHouseholdMenu(false);
                                                        }}
                                                    >
                                                        {h.name}{h.is_default ? ' (default)' : ''}
                                                    </button>
                                                    {h.is_default && (
                                                        <button
                                                            className="btn btn-sm btn-outline-secondary"
                                                            title="Rename household"
                                                            onClick={() => openRenameModal(h)}
                                                        >
                                                            <i className="bi bi-pencil"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <hr className="my-3" />

                                        <button
                                            className="btn btn-sm btn-outline-primary w-100"
                                            onClick={openInviteModal}
                                        >
                                            <i className="bi bi-person-plus me-1"></i>
                                            Invite to current household
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button
                                title="Log out"
                                className="btn btn-sm btn-outline-light"
                                onClick={logout}
                            >
                                <i className="bi bi-box-arrow-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div >
            <div className="container py-5 app-root-shell">
                <div className={`layout-with-sidebar ${showFiltersPanel ? 'drawer-open' : 'drawer-collapsed'}`}>
                    <div className="content-main">
                        {/* KPIs */}
                        <div className={`collapsible-section ${!showKPIs ? 'collapsible-hidden' : ''}`}>
                            <h2 className="mb-3">Key Performance Indicators</h2>
                            <h6 className="text-danger fw-bold fs-6 mb-3">{displayDateRangeText}</h6>
                            <div className="mb-4">
                                <div className="row mb-2 g-2">

                                    <div className="col-md-3">
                                        <div className="card text-white bg-success h-100 text-center" style={{ minHeight: '90px' }}>
                                            <div className="card-body d-flex flex-column justify-content-center" style={{ padding: '0.55rem 0.4rem' }}>
                                                <h6 className="card-title mb-1" style={{ fontSize: '1.3rem' }}>Total Income</h6>
                                                <p className="card-text fs-5 fw-semibold mb-0">${totalIncome.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="card text-white bg-info h-100 text-center" style={{ minHeight: '90px' }}>
                                            <div className="card-body d-flex flex-column justify-content-center" style={{ padding: '0.55rem 0.4rem' }}>
                                                <h6 className="card-title mb-1" style={{ fontSize: '1.3rem' }}>Current Assets</h6>
                                                <p className="card-text fs-5 fw-semibold mb-0">${totalAsset.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="card text-white bg-danger h-100 text-center" style={{ minHeight: '90px' }}>
                                            <div className="card-body d-flex flex-column justify-content-center" style={{ padding: '0.55rem 0.4rem' }}>
                                                <h6 className="card-title mb-1" style={{ fontSize: '1.3rem' }}>Total Liability</h6>
                                                <p className="card-text fs-5 fw-semibold mb-0">${totalLiability.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3">
                                        <div className="card text-white bg-secondary h-100 text-center" style={{ minHeight: '90px' }}>
                                            <div className="card-body d-flex flex-column justify-content-center" style={{ padding: '0.55rem 0.4rem' }}>
                                                <h6 className="card-title mb-1" style={{ fontSize: '1.3rem' }}>Total Expenses</h6>
                                                <p className="card-text fs-5 fw-semibold mb-0">${totalExpense.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="row mb-2 g-2">
                                    <div className="col-md-12">
                                        <div className="card text-white bg-dark h-100 text-center" style={{ minHeight: '90px' }}>
                                            <div className="card-body d-flex flex-column justify-content-center" style={{ padding: '0.55rem 0.4rem' }}>
                                                <h6 className="card-title mb-1" style={{ fontSize: '1.3rem' }}>Ending Balance</h6>
                                                <p className="card-text fs-5 fw-semibold mb-0">${lastBalance.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="row g-2 align-items-stretch">
                                    <div className="col-12 col-xl-8">
                                        <div className="chart-card w-100" style={{ minHeight: 320 }}>
                                            <div className="d-flex align-items-center justify-content-between px-2 pt-2 mb-1">
                                                <small className="text-muted fw-semibold">Costs / Income vs. Time</small>
                                            </div>
                                            <NetTotalChart data={runningNetTotalData} />
                                        </div>
                                    </div>
                                    <div className="col-12 col-xl-4 d-flex align-items-stretch">
                                        <div className="chart-card w-100" style={{ minHeight: 320 }}>
                                            <div className="d-flex align-items-center justify-content-between px-2 pt-2 mb-1">
                                                <small className="text-muted fw-semibold">Costs / Income vs. Groups</small>
                                                <button
                                                    type="button"
                                                    className="btn btn-link btn-sm p-0"
                                                    title={pieChartGroupBy === 'type' ? 'Group by Category' : 'Group by Type'}
                                                    onClick={() => setPieChartGroupBy(prev => prev === 'type' ? 'category' : 'type')}
                                                    style={{ color: '#0d6efd', lineHeight: 1 }}
                                                    aria-label={pieChartGroupBy === 'type' ? 'Group by Category' : 'Group by Type'}
                                                >
                                                    <i className={`bi ${pieChartGroupBy === 'type' ? 'bi-toggle2-on' : 'bi-toggle2-off'}`}></i>
                                                </button>
                                            </div>
                                            <CostBreakdownChart data={pieChartSource} groupBy={pieChartGroupBy} />
                                        </div>
                                    </div>
                                </div>
                                <hr className="my-2" />
                            </div>
                        </div>

                        <div className={`collapsible-section ${!showForm ? 'collapsible-hidden' : ''}`}>
                            <>
                                <h2 className="mb-4">Add Records</h2>
                                <form onSubmit={handleSubmit} className="row m-4 g-3">
                                    <div className="col-md-6 mb-4">
                                        <label className="form-label">Name</label>
                                        <input
                                            name="name"
                                            className="form-control"
                                            placeholder="e.g. Rent"
                                            value={form.name}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>

                                    <div className="col-md-6">
                                        <label className="form-label">Amount</label>
                                        <div className="input-group">
                                            <div className="input-group-prepend">
                                                <span className="input-group-text">$</span>
                                            </div>
                                            <input
                                                name="amount"
                                                type="number"
                                                step="5.0"
                                                className="form-control"
                                                value={form.amount}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="col-8">
                                        <label className="form-label">Description</label>
                                        <input
                                            name="description"
                                            className="form-control"
                                            placeholder="e.g. Monthly rent for apartment"
                                            value={form.description}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label">Due Date</label>
                                        <div className="form-date" style={{ position: 'relative' }}>
                                            <input
                                                type="date"
                                                name="due_date"
                                                className="form-control"
                                                value={form.due_date}
                                                onChange={handleChange}
                                                required
                                                ref={addDueDateRef}
                                                style={{ paddingRight: '36px' }}
                                            />
                                            <i
                                                className="bi bi-calendar3"
                                                title="Open date picker"
                                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'auto', cursor: 'pointer', color: '#6c757d' }}
                                                onClick={() => {
                                                    if (addDueDateRef.current) {
                                                        try {
                                                            addDueDateRef.current.showPicker?.();
                                                        } catch (e) {
                                                            addDueDateRef.current.focus();
                                                        }
                                                        addDueDateRef.current.focus();
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Type</label>
                                        <select
                                            name="type"
                                            className="form-select"
                                            value={form.type}
                                            onChange={handleChange}
                                            required
                                        >
                                            {TRANSACTION_TYPES.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Category</label>
                                        <select
                                            name="category"
                                            className="form-select"
                                            value={form.category}
                                            onChange={handleChange}
                                        >
                                            {TRANSACTION_CATEGORIES.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Household</label>
                                        <select
                                            name="household"
                                            className="form-select"
                                            value={form.household || currentHouseholdId || ''}
                                            onChange={handleChange}
                                            required
                                        >
                                            {households.map(h => (
                                                <option key={h.id} value={h.id}>{h.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label">Recurrence</label>
                                        <select
                                            value={form.recurrence}
                                            onChange={(e) =>
                                                setForm({ ...form, recurrence: e.target.value })
                                            }
                                            className="form-select"
                                            required
                                        >
                                            <option value="">-- Select Recurrence --</option>
                                            <option value="none">One-Time</option>
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="biweekly">Biweekly</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="bimonthly">Bimonthly</option>
                                            <option value="annually">Annually</option>
                                        </select>
                                    </div>

                                    <div className="col-12">
                                        <button type="submit" className="btn btn-primary">
                                            Submit
                                        </button>
                                    </div>
                                </form>
                                <hr className="my-3" />
                            </>
                        </div>

                        <div className={`collapsible-section ${!showList ? 'collapsible-hidden' : ''}`}>
                            <>
                                <h2 className="mb-4 d-flex justify-content-between align-items-center">
                                    <span>List</span>
                                </h2>

                                <div className="row m-4">
                                    {displayedBills.length === 0 ? (
                                        <div className="col-12">
                                            <div className="alert alert-light border text-center mb-0">
                                                No records match the current filters.
                                            </div>
                                        </div>
                                    ) : (
                                        displayedBills.map((bill) => (
                                            <div key={bill.id} className={now.isAfter(bill.due_date) && bill.type !== 'asset' && bill.reconciled === false ? 'card mb-3 position-relative overdue' : bill.reconciled === true ? 'card mb-3 position-relative reconciled' : 'card mb-3 position-relative'}>
                                                <div className="card-view">
                                                    <div className="position-absolute top-0 end-0 m-2 d-flex gap-2">
                                                        <button
                                                            onClick={() => handleEdit(bill)}
                                                            className="btn btn-light btn-sm"
                                                            title="Edit Bill"
                                                            aria-label="Edit Bill"
                                                        >
                                                            <i className="bi bi-pencil"></i>
                                                        </button>

                                                        <button
                                                            onClick={() => handleDelete(bill)}
                                                            className="btn delete-btn btn-light btn-sm"
                                                            title="Delete Bill"
                                                            aria-label="Delete Bill"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>

                                                    <h5 className="card-title mb-0">
                                                        {bill.name} — ${bill.amount.toFixed(2)}
                                                    </h5>

                                                    <h6 className="text-secondary me-2">{format(parseISO(bill.due_date), 'MM/dd/yyyy')}</h6>
                                                    <p className="card-text mt-2">{bill.description}</p>

                                                    <div className="d-flex align-items-center flex-wrap gap-2">
                                                        <span className={`badge ${getTypeBadgeClass(bill.type)}`}>
                                                            {getTypeLabel(bill.type)}
                                                        </span>

                                                        <span className={`badge ${getCategoryBadgeClass(bill.category)}`}>
                                                            {getCategoryLabel(bill.category)}
                                                        </span>

                                                        {bill.recurrence !== 'none' && (
                                                            <span className="badge bg-secondary ms-2">
                                                                {bill.recurrence.charAt(0).toUpperCase() + bill.recurrence.slice(1)}
                                                            </span>
                                                        )}

                                                        <span className="form-check d-flex align-items-center ms-auto">
                                                            <input
                                                                className="form-check-input me-2"
                                                                type="checkbox"
                                                                id={`reconciled-${bill.id}`}
                                                                checked={bill.reconciled}
                                                                onChange={() => handleToggleReconciled(bill)}
                                                            />
                                                            <label className="form-check-label" htmlFor={`reconciled-${bill.id}`}>
                                                                Reconciled
                                                            </label>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        </div>
                    </div>

                    <div className={`filter-drawer ${showFiltersPanel ? 'open' : 'collapsed'}`}>
                        <div className="filter-rail">
                            <button
                                type="button"
                                className="filter-toggle-btn"
                                title={showFiltersPanel ? 'Hide filters' : 'Show filters'}
                                onClick={() => setShowFiltersPanel(prev => !prev)}
                                aria-label={showFiltersPanel ? 'Hide filters' : 'Show filters'}
                            >
                                <i className={`bi ${showFiltersPanel ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
                            </button>
                            <span className="filter-rail-label" onClick={() => setShowFiltersPanel(prev => !prev)} style={{ cursor: 'pointer' }}>
                                {showFiltersPanel ? 'Hide Filters' : 'Show Filters'}
                                <i className={`bi ${showFiltersPanel ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                            </span>
                        </div>

                        <aside className="filter-drawer-panel">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="mb-0">Filters</h5>
                                <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={clearFilter}
                                    type="button"
                                >
                                    Clear
                                </button>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Search</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Name, description, type..."
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Type</label>
                                <select
                                    className="form-select"
                                    value={selectedTypeFilter}
                                    onChange={(e) => setSelectedTypeFilter(e.target.value)}
                                >
                                    <option value="">All Types</option>
                                    {TRANSACTION_TYPES.filter(opt => opt.value).map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Category</label>
                                <select
                                    className="form-select"
                                    value={selectedCategoryFilter}
                                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                                >
                                    <option value="">All Categories</option>
                                    {TRANSACTION_CATEGORIES.filter(opt => opt.value).map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Sort</label>
                                <div className="input-group">
                                    <select
                                        className="form-select"
                                        value={sortField}
                                        onChange={(e) => setSortField(e.target.value)}
                                    >
                                        <option value="due_date">Due Date</option>
                                        <option value="amount">Cost</option>
                                        <option value="date_added">Date Added</option>
                                    </select>
                                    <button
                                        type="button"
                                        className="btn btn-outline-secondary"
                                        title={sortAsc ? 'Sort descending' : 'Sort ascending'}
                                        onClick={() => setSortAsc(prev => !prev)}
                                    >
                                        <i className={`bi ${sortAsc ? 'bi-sort-up' : 'bi-sort-down'}`}></i>
                                    </button>
                                </div>
                            </div>

                            <div className="mb-3">
                                <button
                                    type="button"
                                    className={`btn btn-sm w-100 ${showReconciled ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setShowReconciled(prev => !prev)}
                                >
                                    {showReconciled ? 'Hide Reconciled' : 'Show Reconciled'}
                                </button>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Start Date</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        ref={startDateRef}
                                        style={{ paddingRight: '36px' }}
                                    />
                                    <i
                                        className="bi bi-calendar3"
                                        title="Open date picker"
                                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6c757d' }}
                                        onClick={() => {
                                            if (startDateRef.current) {
                                                try { startDateRef.current.showPicker?.(); } catch (e) { startDateRef.current.focus(); }
                                                startDateRef.current.focus();
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">End Date</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        ref={endDateRef}
                                        style={{ paddingRight: '36px' }}
                                    />
                                    <i
                                        className="bi bi-calendar3"
                                        title="Open date picker"
                                        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#6c757d' }}
                                        onClick={() => {
                                            if (endDateRef.current) {
                                                try { endDateRef.current.showPicker?.(); } catch (e) { endDateRef.current.focus(); }
                                                endDateRef.current.focus();
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="d-flex flex-wrap gap-2">
                                <button className="btn btn-sm btn-outline-primary" onClick={() => setDateRange(30)} type="button">Next 30 Days</button>
                                <button className="btn btn-sm btn-outline-primary" onClick={() => setDateRange(60)} type="button">Next 60 Days</button>
                                <button className="btn btn-sm btn-outline-success" onClick={filterUntilNextIncome} type="button">Until Next Income</button>
                            </div>
                        </aside>
                    </div>
                </div>

                {/* Delete confirmation modal */}
                {showDeleteModal && (
                    <div className="modal show fade d-block mt-5" tabIndex="-1" role="dialog">
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title">Delete Bill</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)} />
                                </div>
                                <div className="modal-body">
                                    <p>Are you sure you want to delete:</p>
                                    <p><strong>{billToDelete?.name}</strong> (${billToDelete?.amount.toFixed(2)}) on {format(new Date(billToDelete?.due_date), 'MM/dd/yyyy')}</p>

                                    {billToDelete?.recurrence_id && (
                                        <div className="form-check mt-3">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                id="deleteSeriesCheckbox"
                                                checked={deleteSeries}
                                                onChange={(e) => setDeleteSeries(e.target.checked)}
                                            />
                                            <label className="form-check-label" htmlFor="deleteSeriesCheckbox">
                                                Delete entire series
                                            </label>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Edit Modal */}

                {showEditModal && (
                    <div className="modal show fade d-block mt-5" tabIndex="-1" role="dialog">
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title">Edit Bill</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowEditModal(false)}
                                    />
                                </div>

                                <div className="modal-body">
                                    <EditForm
                                        editForm={editForm}
                                        setEditForm={setEditForm}
                                        editSeries={editSeries}
                                        setEditSeries={setEditSeries}
                                        editError={editError}
                                        handleUpdate={handleUpdate}
                                    />
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowEditModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        form="edit-bill-form"
                                        className="btn btn-primary"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* Delete Undo Toast */}
                {toast && (
                    <div
                        className="toast show position-fixed bottom-0 end-0 m-4 p-3 bg-light border shadow-sm"
                        style={{ minWidth: '200px', zIndex: 9999 }}
                    >
                        <div className="d-flex justify-content-between align-items-center">
                            <div><strong>{toast.billName}</strong> (${toast.billAmt.toFixed(2)}) was deleted...</div>
                            <button className="btn btn-link btn-sm" onClick={toast.onUndo}>
                                Undo
                            </button>
                        </div>
                    </div>
                )}

                {showRenameModal && (
                    <div className="modal show fade d-block mt-5" tabIndex="-1" role="dialog">
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title">Rename Household</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowRenameModal(false)}
                                    />
                                </div>
                                <form onSubmit={handleRenameSubmit}>
                                    <div className="modal-body">
                                        <label htmlFor="householdName" className="form-label">Household Name</label>
                                        <input
                                            type="text"
                                            id="householdName"
                                            className="form-control"
                                            value={renameValue}
                                            onChange={(e) => setRenameValue(e.target.value)}
                                            autoFocus
                                            required
                                        />
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => setShowRenameModal(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Save
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Invite Modal */}
                {showInviteModal && (
                    <div className="modal show fade d-block mt-5" tabIndex="-1" role="dialog">
                        <div className="modal-dialog" role="document">
                            <div className="modal-content">
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title">Invite to Household</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowInviteModal(false)}
                                    />
                                </div>
                                <form onSubmit={handleInviteSubmit}>
                                    <div className="modal-body">
                                        <label htmlFor="inviteUsername" className="form-label">Username</label>
                                        <input
                                            type="text"
                                            id="inviteUsername"
                                            className="form-control"
                                            value={inviteUsername}
                                            onChange={(e) => setInviteUsername(e.target.value)}
                                            autoFocus
                                            required
                                        />

                                        {inviteError && (
                                            <div className="alert alert-danger py-2 mt-3 mb-0">
                                                {inviteError}
                                            </div>
                                        )}
                                        {inviteSuccess && (
                                            <div className="alert alert-success py-2 mt-3 mb-0">
                                                {inviteSuccess}
                                            </div>
                                        )}
                                    </div>
                                    <div className="modal-footer">
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => setShowInviteModal(false)}
                                        >
                                            Close
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Invite
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

            </div >

        </>
    );
}
