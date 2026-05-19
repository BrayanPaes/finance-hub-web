import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

export default function Dashboard() {
  const today = new Date().toISOString().split('T')[0]
  
  const [transactions, setTransactions] = useState([])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('income') 
  const [date, setDate] = useState(today)
  const [editingId, setEditingId] = useState(null)
  const navigate = useNavigate()

  const fetchTransactions = () => {
    const token = localStorage.getItem('@FinanceHub:token')
    if (!token) return
    
    api.get('/api/transactions', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(response => setTransactions(response.data))
    .catch(error => console.error("Error fetching transactions:", error))
  }

  useEffect(() => {
    const token = localStorage.getItem('@FinanceHub:token')
    if (!token) {
      setTimeout(() => navigate('/login'), 0)
    } else {
      fetchTransactions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('@FinanceHub:token')
    navigate('/login')
  }

  const handleSaveTransaction = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('@FinanceHub:token')

    try {
      if (editingId) {
        await api.put(`/api/transactions/${editingId}`, {
          description,
          amount: Number(amount), 
          type,
          date
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } else {
        await api.post('/api/transactions', {
          description,
          amount: Number(amount), 
          type,
          date
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      }
      
      setDescription('')
      setAmount('')
      setType('income')
      setDate(today)
      setEditingId(null)
      fetchTransactions() 
    } catch (error) {
      console.error("Error saving transaction:", error)
      alert("Error saving transaction.")
    }
  }

  const handleEditClick = (transaction) => {
    setDescription(transaction.description)
    setAmount(transaction.amount)
    setType(transaction.type)
    setDate(transaction.date ? transaction.date.split('T')[0] : today)
    setEditingId(transaction.id)
  }

  const handleCancelEdit = () => {
    setDescription('')
    setAmount('')
    setType('income')
    setDate(today)
    setEditingId(null)
  }

  const handleDeleteTransaction = async (id) => {
    const token = localStorage.getItem('@FinanceHub:token')
    try {
      await api.delete(`/api/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchTransactions() 
    } catch (error) {
      console.error("Error deleting transaction:", error)
    }
  }

  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount), 0)
    
  const expense = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + Number(t.amount), 0)
    
  const total = income - expense

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('T')[0].split('-')
    return `${day}/${month}/${year}`
  }

  return (
    <div className="min-h-screen p-8 bg-gray-100">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">FinanceHub</h1>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="text-gray-500">Income</h3>
            <p className="text-2xl font-bold text-green-600">R$ {income.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="text-gray-500">Expenses</h3>
            <p className="text-2xl font-bold text-red-600">R$ {expense.toFixed(2)}</p>
          </div>
          <div className="p-4 text-white bg-blue-600 rounded-lg shadow">
            <h3 className="text-blue-100">Total Balance</h3>
            <p className="text-2xl font-bold">R$ {total.toFixed(2)}</p>
          </div>
        </div>

        {/* Transaction Form */}
        <form onSubmit={handleSaveTransaction} className="p-6 mb-8 bg-white rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold">
            {editingId ? 'Edit Transaction' : 'New Transaction'}
          </h2>
          
          <div className="flex flex-wrap gap-4">
            <input 
              type="text" 
              placeholder="Description" 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="flex-1 p-2 border rounded min-w-[200px]"
            />
            <input 
              type="number" 
              step="0.01"
              placeholder="Amount" 
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-32 p-2 border rounded"
            />
            <input 
              type="date" 
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="p-2 border rounded text-gray-600"
            />
            <select 
              value={type}
              onChange={e => setType(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
              {editingId ? 'Update' : 'Save'}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Transaction History */}
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="mb-4 text-xl font-semibold">History</h2>
          
          {transactions.length === 0 ? (
            <p className="text-gray-500">No transactions found.</p>
          ) : (
            <ul className="space-y-3">
              {transactions.map((t) => (
                <li key={t.id} className="flex items-center justify-between p-3 border rounded bg-gray-50">
                  <div className="flex justify-between flex-1 mr-4">
                    <div className="flex flex-col">
                      <span className="font-semibold">{t.description}</span>
                      <span className="text-xs text-gray-500">
                        {formatDate(t.date || t.createdAt || t.created_at)}
                      </span>
                    </div>
                    <span className={`font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => handleEditClick(t)}
                      className="px-2 py-1 text-sm text-white bg-yellow-500 rounded hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleDeleteTransaction(t.id)}
                      className="px-2 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}