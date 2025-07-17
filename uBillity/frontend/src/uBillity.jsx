import React, { useEffect, useState, useRef } from 'react';
import api from './api';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

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
    const sortedBills = [...bills].sort((a, b) => {
        const dateA = new Date(a.due_date);
        const dateB = new Date(b.due_date);
        return sortAsc ? dateA - dateB : dateB - dateA;
    });
    const [form, setForm] = useState({
        name: '',
        description: '',
        amount: '',
        type: '',
        category: '',
        due_date: '',
    });

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

    const totalLiability = bills
        .filter(bill => bill.type === 'liability')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);

    const totalIncome = bills
        .filter(bill => bill.type === 'income')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);

    const totalAsset = bills
        .filter(bill => bill.type === 'asset')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);

    const totalExpense = bills
        .filter(bill => bill.type === 'expense')
        .reduce((sum, bill) => sum + parseFloat(bill.amount || 0), 0);

    const netTotal = totalAsset + totalIncome - totalLiability - totalExpense

    const handleChange = e => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleDelete = (billId) => {
        const billToDelete = bills.find(b => b.id === billId);
        const updatedBills = bills.filter(b => b.id !== billId);
        setBills(updatedBills);

        // Set toast with undo logic
        setToast({
            billName: billToDelete.name,
            billAmt: billToDelete.amount,
            billDate: billToDelete.due_date,
            onUndo: () => {
                clearTimeout(toastTimeout.current);
                setBills([...updatedBills, billToDelete]);
                setToast(null);
            }
        });

        // Schedule actual delete after delay
        toastTimeout.current = setTimeout(async () => {
            try {
                await api.delete(`bills/${billId}/`);
            } catch (err) {
                console.error('Delete failed:', err);
                // Optionally re-add the bill if delete failed
            } finally {
                setToast(null);
            }
        }, 5000);
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
        };

        try {
            await api.post('bills/', cleanedForm);
            setForm({
                name: '',
                description: '',
                amount: '',
                type: '',
                category: '',
                due_date: '',
            });
            fetchBills();
        } catch (error) {
            console.error('Failed to submit bill:', error.response?.data || error.message);
            // Optionally show error feedback to the user here
        }
    };


    return (
        <>
            {/* Dashboard header and Show/Hide button */}
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
                                        <h5 className="card-title">Total Income</h5>
                                        <p className="card-text display-6">${totalIncome.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card text-white bg-info h-100 text-center">
                                    <div className="card-body d-flex flex-column justify-content-center">
                                        <h5 className="card-title">Total Assets</h5>
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
                                <input
                                    name="amount"
                                    type="number"
                                    step="0.01"
                                    className="form-control"
                                    value={form.amount}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="col-12">
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
                                <label className="form-label">Due Date</label>
                                <input
                                    name="due_date"
                                    type="date"
                                    className="form-control"
                                    value={form.due_date}
                                    onChange={handleChange}
                                    required
                                />
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
                {/* Records List */}
                <div className={`collapsible-section ${!showList ? 'collapsible-hidden' : ''}`}>
                    <>
                        <h2 className="mb-4 d-flex justify-content-between align-items-center">
                            <span>List</span>
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setSortAsc((prev) => !prev)}
                                title={`Sort by Due Date (${sortAsc ? 'Desc' : 'Asc'})`}
                            >
                                <i className={`bi ${sortAsc ? 'bi-sort-down' : 'bi-sort-up'}`}></i>
                                <span className="ms-1">Due Date</span>
                            </button>
                        </h2>
                        {/* Bills List (Cards) Section */}

                        < div className="row m-4" >
                            {
                                sortedBills.map((bill) => (
                                    <div key={bill.id} className="card mb-3 position-relative">
                                        <div className="card-body">
                                            <button
                                                onClick={() => handleDelete(bill.id)}
                                                className="btn delete-btn btn-light btn-sm position-absolute top-0 end-0 m-2"
                                                title="Delete Bill"
                                                aria-label="Delete Bill"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>

                                            <h5 className="card-title mb-0">
                                                {bill.name} — ${bill.amount.toFixed(2)}
                                            </h5>

                                            <h6 className="text-secondary me-2">{bill.due_date}</h6>
                                            <p className="card-text mt-2">{bill.description}</p>
                                            <div>
                                                {/* Type badge */}
                                                <span className={`badge me-2 ${getTypeBadgeClass(bill.type)}`}>
                                                    {getTypeLabel(bill.type)}
                                                </span>

                                                {/* Category badge */}
                                                <span className={`badge ${getCategoryBadgeClass(bill.category)}`}>
                                                    {getCategoryLabel(bill.category)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </>
                </div>

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
