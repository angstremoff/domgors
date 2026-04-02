'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardContent() {
  const [activeTab, setActiveTab] = useState<'users' | 'agencies' | 'properties'>('users');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/${activeTab}`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Ошибка загрузки данных');
      }
      const data = await res.json();
      setItems(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить запись?')) return;
    try {
      const res = await fetch(`/api/${activeTab}/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Ошибка удаления');
      fetchItems();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const tabs = [
    { key: 'users' as const, label: 'Пользователи' },
    { key: 'agencies' as const, label: 'Агентства' },
    { key: 'properties' as const, label: 'Объявления' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">DomGo Admin</h1>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-800 text-sm"
          >
            Выйти
          </button>
        </div>
      </header>

      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {error && <p className="text-red-600 mb-4">{error}</p>}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Загрузка...</div>
          ) : (
            <DataTable
              type={activeTab}
              items={items}
              onDelete={handleDelete}
              onRefresh={fetchItems}
            />
          )}
        </div>
      </main>
    </div>
  );
}

function DataTable({
  type,
  items,
  onDelete,
  onRefresh,
}: {
  type: 'users' | 'agencies' | 'properties';
  items: any[];
  onDelete: (id: string) => void;
  onRefresh: () => void;
}) {
  if (items.length === 0) {
    return <div className="p-8 text-center text-gray-500">Нет записей</div>;
  }

  if (type === 'users') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Имя</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Телефон</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Агентство</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Создан</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{user.id?.slice(0, 8)}...</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.name || '—'}</td>
                <td className="px-4 py-3">{user.phone || '—'}</td>
                <td className="px-4 py-3">{user.is_agency ? 'Да' : 'Нет'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('ru') : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <EditUserModal user={user} onSave={onRefresh} />
                    <button
                      onClick={() => onDelete(user.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'agencies') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Название</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Телефон</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Сайт</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Город</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((agency) => (
              <tr key={agency.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{agency.id?.slice(0, 8)}...</td>
                <td className="px-4 py-3">{agency.name || '—'}</td>
                <td className="px-4 py-3">{agency.phone || '—'}</td>
                <td className="px-4 py-3">{agency.email || '—'}</td>
                <td className="px-4 py-3">{agency.site || '—'}</td>
                <td className="px-4 py-3">{agency.city_id || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <EditAgencyModal agency={agency} onSave={onRefresh} />
                    <button
                      onClick={() => onDelete(agency.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Заголовок</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Тип</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Цена</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Статус</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Город</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((prop) => (
            <tr key={prop.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs">{prop.id?.slice(0, 8)}...</td>
              <td className="px-4 py-3">{prop.title || '—'}</td>
              <td className="px-4 py-3">{prop.property_type || '—'}</td>
              <td className="px-4 py-3">{prop.price ? `${prop.price} €` : '—'}</td>
              <td className="px-4 py-3">{prop.status || '—'}</td>
              <td className="px-4 py-3">{prop.city_id || '—'}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <EditPropertyModal property={prop} onSave={onRefresh} />
                  <button
                    onClick={() => onDelete(prop.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Удалить
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditUserModal({ user, onSave }: { user: any; onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [isAgency, setIsAgency] = useState(user.is_agency || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/users/${user.id}`, { credentials: 'include', credentials: 'include',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, is_agency: isAgency }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      onSave();
      setOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-blue-600 hover:text-blue-800">
        Ред.
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="text-lg font-semibold mb-4">Редактировать пользователя</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAgency}
                onChange={(e) => setIsAgency(e.target.checked)}
                id="is_agency"
              />
              <label htmlFor="is_agency" className="text-sm">Агентство</label>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-gray-600">
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function EditAgencyModal({ agency, onSave }: { agency: any; onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(agency.name || '');
  const [phone, setPhone] = useState(agency.phone || '');
  const [email, setEmail] = useState(agency.email || '');
  const [site, setSite] = useState(agency.site || '');
  const [location, setLocation] = useState(agency.location || '');
  const [description, setDescription] = useState(agency.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/agencies/${agency.id}`, { credentials: 'include', credentials: 'include',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, site, location, description }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      onSave();
      setOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-blue-600 hover:text-blue-800">
        Ред.
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="text-lg font-semibold mb-4">Редактировать агентство</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Сайт</label>
              <input
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-gray-600">
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function EditPropertyModal({ property, onSave }: { property: any; onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(property.title || '');
  const [description, setDescription] = useState(property.description || '');
  const [price, setPrice] = useState(property.price || '');
  const [status, setStatus] = useState(property.status || 'active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/properties/${property.id}`, { credentials: 'include', credentials: 'include',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: price ? Number(price) : null,
          status,
        }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения');
      onSave();
      setOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-blue-600 hover:text-blue-800">
        Ред.
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h2 className="text-lg font-semibold mb-4">Редактировать объявление</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Заголовок</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цена</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="active">Активно</option>
                <option value="sold">Продано</option>
                <option value="rented">Сдано</option>
              </select>
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-gray-600">
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
