import React, { useEffect, useState, useRef } from 'react';
import api from './api';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';


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
    const [showKPIs, setShowKPIs] = useState(true);
    const [showForm, setShowForm] = useState(true);
    const [showList, setShowList] = useState(true);

    const [deletedBill, setDeletedBill] = useState(null);
    const toastTimeout = useRef(null);
    const [toast, setToast] = useState(null);

    const [bills, setBills] = useState([]);
    const [sortAsc, setSortAsc] = useState(true);

    const [form, setForm] = useState({
        name: '',
        description: '',
        amount: '',
        type: '',
        category: '',
        due_date: '',
        reconciled: '',
        recurrence: 'none',
    });

    const [showReconciled, setShowReconciled] = useState(true);
    const handleToggleReconciled = async (bill) => {
        if (!bill || typeof bill !== 'object' || !bill.id) {
            console.error('Invalid bill object passed:', bill);
            return;
        }

        try {
            const updatedReconciled = !bill.reconciled;

            await axios.patch(`http://localhost:8000/api/bills/${bill.id}/`, {
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

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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
        setStartDate('')
        setEndDate('')
    }

    const sortedBills = [...bills].sort((a, b) => {
        return sortAsc
            ? new Date(a.due_date) - new Date(b.due_date)
            : new Date(b.due_date) - new Date(a.due_date);
    });

    const filteredByDate = sortedBills.filter(bill => {
        const billDate = new Date(bill.due_date);
        const afterStart = !startDate || new Date(startDate) <= billDate;
        const beforeEnd = !endDate || billDate <= new Date(endDate);
        return afterStart && beforeEnd;
    });

    const displayedBills = showReconciled
        ? filteredByDate
        : sortedBills.filter(bill => !bill.reconciled);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [billToDelete, setBillToDelete] = useState(null);
    const [deleteSeries, setDeleteSeries] = useState(false);

    const fetchBills = async () => {
        const res = await api.get('bills/');
        setBills(res.data);
    };

    useEffect(() => {
        fetchBills();
    }, []);

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

    // //Daily sums
    // const netTotalByDate = {};
    // filteredByDate.forEach(bill => {
    //     const dateKey = bill.due_date; // assuming ISO string like "2025-08-01"
    //     const amount = parseFloat(bill.amount);

    //     if (!netTotalByDate[dateKey]) {
    //         netTotalByDate[dateKey] = 0;
    //     }

    //     switch (bill.type) {
    //         case 'asset':
    //         case 'income':
    //             netTotalByDate[dateKey] += amount;
    //             break;
    //         case 'expense':
    //         case 'liability':
    //             netTotalByDate[dateKey] -= amount;
    //             break;
    //     }
    // });

    // //Totals to date map
    // const netTotalData = Object.entries(netTotalByDate)
    //     .map(([date, net]) => ({ date, net }))
    //     .sort((a, b) => new Date(a.date) - new Date(b.date));

    // const NetTotalChart = ({ data }) => {
    //     return (
    //         <div style={{ width: '100%', height: 300 }}>
    //             <ResponsiveContainer>
    //                 <LineChart data={data}>
    //                     <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
    //                     <XAxis dataKey="date" />
    //                     <YAxis />
    //                     <Tooltip />
    //                     <Line type="monotone" dataKey="net" stroke="#82ca9d" strokeWidth={2} />
    //                 </LineChart>
    //             </ResponsiveContainer>
    //         </div>
    //     );
    // };

    const handleChange = e => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

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
                                className={`btn btn-sm ${showList ? 'btn-primary' : 'btn-outline-light'}`}
                                onClick={() => setShowList(prev => !prev)}
                            >
                                <i className="bi bi-card-list"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="container py-5">
                {/* KPIs */}
                <div className={`collapsible-section ${!showKPIs ? 'collapsible-hidden' : ''}`}>
                    <h2 className="mb-4">KPIs</h2>
                    <div className="mb-4">
                        <div className="row mb-4 g-3">

                            <div className="col-md-3">
                                <div className="card text-white bg-success h-100 text-center">
                                    <div className="card-body d-flex flex-column justify-content-center">
                                        <h5 className="card-title">Net Income</h5>
                                        <p className="card-text display-6">${totalIncome.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-white bg-info h-100 text-center">
                                    <div className="card-body d-flex flex-column justify-content-center">
                                        <h5 className="card-title">Current Assets</h5>
                                        <p className="card-text display-6">${totalAsset.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-white bg-danger h-100 text-center">
                                    <div className="card-body d-flex flex-column justify-content-center">
                                        <h5 className="card-title">Total Liability</h5>
                                        <p className="card-text display-6">${totalLiability.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-white bg-secondary h-100 text-center">
                                    <div className="card-body d-flex flex-column justify-content-center">
                                        <h5 className="card-title">Total Expenses</h5>
                                        <p className="card-text display-6">${totalExpense.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row mb-4 g-3">

                            <div className="col-md-12">
                                <div className="card text-white bg-dark h-100 text-center">
                                    <div className="card-body d-flex flex-column justify-content-center">
                                        <h5 className="card-title">Net Total</h5>
                                        <p className="card-text display-6">${netTotal.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Line Chart */}
                        {/* <NetTotalChart data={netTotalData} /> */}

                        <hr className="my-5" />
                    </div>
                </div>
                {/* Add Records Form */}
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
                                <div className="form-date">
                                    <input
                                        type="date"
                                        name="due_date"
                                        className="form-control"
                                        value={form.due_date}
                                        onChange={handleChange}
                                        required
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
                        <hr className="my-5" />
                    </>
                </div>
                {/* Records List Header and Filters for Card View*/}
                <div className={`collapsible-section ${!showList ? 'collapsible-hidden' : ''}`}>
                    <>
                        <h2 className="mb-4 d-flex justify-content-between">
                            <span>List</span>
                            <div className="d-flex justify-content-end gap-2">

                                <button
                                    className={`btn btn-sm ${showReconciled ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setShowReconciled(prev => !prev)}
                                >
                                    {showReconciled ? 'Reconciled Shown' : 'Reconciled Hidden'}
                                </button>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => setSortAsc((prev) => !prev)}
                                    title={`Sort by Due Date (${sortAsc ? 'Desc' : 'Asc'})`}
                                >
                                    <i className={`bi ${sortAsc ? 'bi-sort-down' : 'bi-sort-up'}`}></i>
                                    <span className="ms-1">Due Date</span>
                                </button>
                            </div>
                        </h2>
                        {/* Bills List Card View Section */}
                        <div className="row d-flex m-4 flex-wrap mb-3 bg-light rounded border p-2">
                            <h5>Date Filters</h5>
                            <div className="col-md-3">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3">
                                <label>End Date</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>

                            {/* Quick Range Buttons */}
                            <div className="d-flex flex-wrap gap-2 mt-4 col-md-6">
                                <button className="btn btn-outline-primary" onClick={() => setDateRange(30)}>Next 30 Days</button>
                                <button className="btn btn-outline-primary" onClick={() => setDateRange(60)}>Next 60 Days</button>
                                <button className="btn btn-outline-success" onClick={filterUntilNextIncome}>Until Next Income</button>
                                <button className="btn btn-outline-success" onClick={clearFilter}>Clear</button>
                            </div>

                        </div>
                        < div className="row m-4" >
                            {
                                displayedBills.map((bill) => (
                                    <div key={bill.id} className="card mb-3 position-relative">
                                        <div className="card-body">
                                            {/* Delete button */}
                                            <button
                                                onClick={() => handleDelete(bill)}
                                                className="btn delete-btn btn-light btn-sm position-absolute top-0 end-0 m-2"
                                                title="Delete Bill"
                                                aria-label="Delete Bill"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>

                                            <h5 className="card-title mb-0">
                                                {bill.name} — ${bill.amount.toFixed(2)}
                                            </h5>

                                            <h6 className="text-secondary me-2">{format(parseISO(bill.due_date), 'MM/dd/yyyy')}</h6>
                                            <p className="card-text mt-2">{bill.description}</p>

                                            {/* Bottom bar of Card View */}
                                            <div className="d-flex align-items-center flex-wrap gap-2">
                                                {/* Type badge */}
                                                <span className={`badge ${getTypeBadgeClass(bill.type)}`}>
                                                    {getTypeLabel(bill.type)}
                                                </span>

                                                {/* Category badge */}
                                                <span className={`badge ${getCategoryBadgeClass(bill.category)}`}>
                                                    {getCategoryLabel(bill.category)}
                                                </span>

                                                {/* Recurrence Badge */}
                                                {bill.recurrence !== 'none' && (
                                                    <span className="badge bg-secondary ms-2">
                                                        {bill.recurrence.charAt(0).toUpperCase() + bill.recurrence.slice(1)}
                                                    </span>
                                                )}

                                                {/* Reconciled Checkbox */}
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
                            }
                        </div>
                    </>
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

            </div >

        </>
    );
}
