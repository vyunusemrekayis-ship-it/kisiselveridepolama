import { useState } from 'react';
import { loadFinance, saveFinance } from './financeStore';
import FinanceDashboard from './FinanceDashboard';
import FinanceSubscriptions from './FinanceSubscriptions';
import FinanceCategories from './FinanceCategories';
import FinanceInvestments from './FinanceInvestments';
import { FinanceIncomes, FinanceExpenses, FinanceCreditCards, FinanceAnalysis } from './FinanceIncExp';

const TABS = [
  { id: 'dashboard',     label: 'Dashboard' },
  { id: 'incomes',       label: 'Gelirler' },
  { id: 'expenses',      label: 'Giderler' },
  { id: 'subscriptions', label: 'Abonelikler' },
  { id: 'cards',         label: 'Kredi Kartları' },
  { id: 'analysis',      label: 'Aylık Analiz' },
  { id: 'categories',    label: 'Kategoriler' },
  { id: 'investments',   label: 'Yatırımlar' },
];

export default function Finance() {
  const [data, setData] = useState(loadFinance);
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleSave = (newData) => {
    setData(newData);
    saveFinance(newData);
  };

  const navigate = (tabId) => setActiveTab(tabId);

  return (
    <div className="animate-fadeIn">
      {/* Başlık */}
      <div style={{ marginBottom: 16 }}>
        <h2 className="section-title">Finans</h2>
      </div>

      {/* Tab bar — yatay kaydırılabilir */}
      <div className="scroll-x" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 2, background: '#222', border: '1px solid rgba(255,255,255,.07)', borderRadius: 10, padding: 3, width: 'fit-content', minWidth: '100%' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '5px 14px',
                borderRadius: 8,
                border: 0,
                background: activeTab === t.id ? '#2c2c2c' : 'transparent',
                color: activeTab === t.id ? '#e8edf5' : 'rgba(232,237,245,.4)',
                fontSize: 12,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'inherit',
                transition: 'all .15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* İçerik */}
      {activeTab === 'dashboard'     && <FinanceDashboard     data={data} onNavigate={navigate} />}
      {activeTab === 'incomes'       && <FinanceIncomes        data={data} onSave={handleSave} />}
      {activeTab === 'expenses'      && <FinanceExpenses       data={data} onSave={handleSave} />}
      {activeTab === 'subscriptions' && <FinanceSubscriptions  data={data} onSave={handleSave} />}
      {activeTab === 'cards'         && <FinanceCreditCards    data={data} onSave={handleSave} />}
      {activeTab === 'analysis'      && <FinanceAnalysis       data={data} onSave={handleSave} />}
      {activeTab === 'categories'    && <FinanceCategories     data={data} />}
      {activeTab === 'investments'   && <FinanceInvestments    data={data} onSave={handleSave} />}
    </div>
  );
}
