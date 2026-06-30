import { useState, useEffect } from 'react';
import styles from '@/styles/admin-dashboard.module.css';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/lib/api-client';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  subcategories: SubCategory[];
  createdAt: string;
}

interface SubCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  image: string;
  categoryId: string;
  createdAt: string;
}

interface FormState {
  name: string;
  description: string;
  icon: string;
  image: string;
}

const initialFormState: FormState = {
  name: '',
  description: '',
  icon: '',
  image: '',
};

export default function CategoriesManagement() {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Category form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState<FormState>(initialFormState);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  // Subcategory form states
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [subcategoryForm, setSubcategoryForm] = useState<FormState>(initialFormState);
  const [editingSubcategoryId, setEditingSubcategoryId] = useState<string | null>(null);

  // Expanded category for subcategories view
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/categories');
      setCategories(response.data);
      setError('');
    } catch (err: any) {
      setError('Failed to fetch categories');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    setCategoryForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubcategoryFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    setSubcategoryForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!categoryForm.name.trim()) {
        setError('Category name is required');
        return;
      }

      if (editingCategoryId) {
        await apiClient.patch(`/admin/categories/${editingCategoryId}`, categoryForm);
        setSuccess('Category updated successfully');
      } else {
        await apiClient.post('/admin/categories', categoryForm);
        setSuccess('Category created successfully');
      }

      setCategoryForm(initialFormState);
      setEditingCategoryId(null);
      setShowCategoryForm(false);
      setError('');
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save category');
    }
  };

  const handleEditCategory = (category: Category) => {
    setCategoryForm({
      name: category.name,
      description: category.description,
      icon: category.icon,
      image: category.image,
    });
    setEditingCategoryId(category.id);
    setShowCategoryForm(true);
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" and all its subcategories?`)) {
      return;
    }

    try {
      await apiClient.delete(`/admin/categories/${id}`);
      setSuccess('Category deleted successfully');
      setError('');
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleAddSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedCategoryId) {
        setError('Please select a category');
        return;
      }

      if (!subcategoryForm.name.trim()) {
        setError('Subcategory name is required');
        return;
      }

      if (editingSubcategoryId) {
        await apiClient.patch(
          `/admin/categories/${selectedCategoryId}/subcategories/${editingSubcategoryId}`,
          subcategoryForm
        );
        setSuccess('Subcategory updated successfully');
      } else {
        await apiClient.post(`/admin/categories/${selectedCategoryId}/subcategories`, subcategoryForm);
        setSuccess('Subcategory created successfully');
      }

      setSubcategoryForm(initialFormState);
      setEditingSubcategoryId(null);
      setShowSubcategoryForm(false);
      setError('');
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save subcategory');
    }
  };

  const handleEditSubcategory = (subcategory: SubCategory) => {
    setSubcategoryForm({
      name: subcategory.name,
      description: subcategory.description,
      icon: subcategory.icon,
      image: subcategory.image,
    });
    setEditingSubcategoryId(subcategory.id);
    setSelectedCategoryId(subcategory.categoryId);
    setShowSubcategoryForm(true);
  };

  const handleDeleteSubcategory = async (categoryId: string, subcategoryId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      await apiClient.delete(`/admin/categories/${categoryId}/subcategories/${subcategoryId}`);
      setSuccess('Subcategory deleted successfully');
      setError('');
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete subcategory');
    }
  };

  const cancelCategoryForm = () => {
    setCategoryForm(initialFormState);
    setEditingCategoryId(null);
    setShowCategoryForm(false);
  };

  const cancelSubcategoryForm = () => {
    setSubcategoryForm(initialFormState);
    setEditingSubcategoryId(null);
    setSelectedCategoryId(null);
    setShowSubcategoryForm(false);
  };

  if (loading && categories.length === 0) {
    return (
      <div className={styles.adminContainer}>
        <div className={styles.loadingSpinner}>Loading categories...</div>
      </div>
    );
  }

  return (
    <div className={styles.adminContainer}>
      <h1 className={styles.adminTitle}>Categories Management</h1>

      {error && <div className={styles.errorMessage}>{error}</div>}
      {success && <div className={styles.successMessage}>{success}</div>}

      {/* Category Form */}
      {showCategoryForm && (
        <div className={styles.formContainer}>
          <h2>{editingCategoryId ? 'Edit Category' : 'Add New Category'}</h2>
          <form onSubmit={handleAddCategory}>
            <div className={styles.formGroup}>
              <label>Category Name *</label>
              <input
                type="text"
                name="name"
                value={categoryForm.name}
                onChange={handleCategoryFormChange}
                placeholder="e.g., Solar Panels"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                name="description"
                value={categoryForm.description}
                onChange={handleCategoryFormChange}
                placeholder="Category description (optional)"
                rows={3}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Icon</label>
                <input
                  type="text"
                  name="icon"
                  value={categoryForm.icon}
                  onChange={handleCategoryFormChange}
                  placeholder="Icon name or URL (optional)"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Image URL</label>
                <input
                  type="text"
                  name="image"
                  value={categoryForm.image}
                  onChange={handleCategoryFormChange}
                  placeholder="Image URL (optional)"
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryBtn}>
                {editingCategoryId ? 'Update Category' : 'Create Category'}
              </button>
              <button type="button" onClick={cancelCategoryForm} className={styles.secondaryBtn}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subcategory Form */}
      {showSubcategoryForm && (
        <div className={styles.formContainer}>
          <h2>{editingSubcategoryId ? 'Edit Subcategory' : 'Add New Subcategory'}</h2>
          
          {!editingSubcategoryId && (
            <div className={styles.formGroup}>
              <label>Select Category *</label>
              <select
                value={selectedCategoryId || ''}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                required
              >
                <option value="">-- Select a Category --</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <form onSubmit={handleAddSubcategory}>
            <div className={styles.formGroup}>
              <label>Subcategory Name *</label>
              <input
                type="text"
                name="name"
                value={subcategoryForm.name}
                onChange={handleSubcategoryFormChange}
                placeholder="e.g., Monocrystalline"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <textarea
                name="description"
                value={subcategoryForm.description}
                onChange={handleSubcategoryFormChange}
                placeholder="Subcategory description (optional)"
                rows={3}
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Icon</label>
                <input
                  type="text"
                  name="icon"
                  value={subcategoryForm.icon}
                  onChange={handleSubcategoryFormChange}
                  placeholder="Icon name or URL (optional)"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Image URL</label>
                <input
                  type="text"
                  name="image"
                  value={subcategoryForm.image}
                  onChange={handleSubcategoryFormChange}
                  placeholder="Image URL (optional)"
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.primaryBtn}>
                {editingSubcategoryId ? 'Update Subcategory' : 'Create Subcategory'}
              </button>
              <button type="button" onClick={cancelSubcategoryForm} className={styles.secondaryBtn}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Action Buttons */}
      {!showCategoryForm && !showSubcategoryForm && (
        <div className={styles.actionButtonsContainer}>
          <button onClick={() => setShowCategoryForm(true)} className={styles.primaryBtn}>
            + Add Category
          </button>
          <button onClick={() => setShowSubcategoryForm(true)} className={styles.primaryBtn}>
            + Add Subcategory
          </button>
        </div>
      )}

      {/* Categories List */}
      <div className={styles.categoriesContainer}>
        <h2>Categories & Subcategories</h2>
        {categories.length === 0 ? (
          <p>No categories found. Click "Add Category" to create one.</p>
        ) : (
          <div className={styles.categoryList}>
            {categories.map(category => (
              <div key={category.id} className={styles.categoryItem}>
                <div className={styles.categoryHeader}>
                  <div className={styles.categoryInfo}>
                    <h3>
                      {category.name}
                    </h3>
                    {category.description && <p className="text-black font-bold">{category.description}</p>}
                    <small>Created: {new Date(category.createdAt).toLocaleDateString()}</small>
                  </div>
                  <div className={styles.categoryActions}>
                    <button
                      onClick={() => handleEditCategory(category)}
                      className={styles.editBtn}
                      title="Edit"
                    >
                      ✎ Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                      className={styles.deleteBtn}
                      title="Delete"
                    >
                      🗑 Delete
                    </button>
                    <button
                      onClick={() => setExpandedCategoryId(
                        expandedCategoryId === category.id ? null : category.id
                      )}
                      className={styles.toggleBtn}
                    >
                      {expandedCategoryId === category.id ? '▼' : '▶'} Subcategories ({category.subcategories?.length || 0})
                    </button>
                  </div>
                </div>

                {/* Subcategories List */}
                {expandedCategoryId === category.id && category.subcategories && (
                  <div className={styles.subcategoryList}>
                    {category.subcategories.length === 0 ? (
                      <p className={styles.noSubcategories}>No subcategories. Create one by clicking "Add Subcategory".</p>
                    ) : (
                      category.subcategories.map(subcategory => (
                        <div key={subcategory.id} className={styles.subcategoryItem}>
                          <div className={styles.subcategoryInfo}>
                            <h4>
                              {subcategory.name}
                            </h4>
                            {subcategory.description && <p className="text-black font-bold">{subcategory.description}</p>}
                          </div>
                          <div className={styles.subcategoryActions}>
                            <button
                              onClick={() => handleEditSubcategory(subcategory)}
                              className={styles.editBtn}
                              title="Edit"
                            >
                              ✎
                            </button>
                            <button
                              onClick={() => handleDeleteSubcategory(category.id, subcategory.id, subcategory.name)}
                              className={styles.deleteBtn}
                              title="Delete"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

