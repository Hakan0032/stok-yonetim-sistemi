import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Form,
  Modal,
  Badge,
  InputGroup,
  Dropdown,
  Alert,
  Pagination
} from 'react-bootstrap';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaFilter,
  FaDownload,
  FaEye,
  FaExclamationTriangle,
  FaBoxes
} from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';
import * as XLSX from 'xlsx';

const Materials = () => {
  // Temporary permission check - always allow access
  const hasPermission = () => true;
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    status: 'active',
    stockLevel: 'all'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: '',
    subcategory: '',
    description: '',
    unit: '',
    unitPrice: '',
    minStock: '',
    maxStock: '',
    quantity: '',
    location: '',
    supplier: '',
    status: 'active'
  });

  useEffect(() => {
    fetchMaterials();
    fetchCategories();
  }, [pagination.page, pagination.limit, searchTerm, filters, sortBy, sortOrder]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm,
        sortBy,
        sortOrder,
        ...filters
      };

      const response = await api.get('/api/materials', { params });
      setMaterials(response.data.materials);
      setPagination(prev => ({
        ...prev,
        total: response.data.total,
        pages: response.data.pages
      }));
    } catch (error) {
      console.error('Materials fetch error:', error);
      toast.error('Malzemeler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/materials/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Categories fetch error:', error);
    }
  };

  const handleShowModal = (mode, material = null) => {
    setModalMode(mode);
    setSelectedMaterial(material);
    
    if (material) {
      setFormData({
        name: material.name || '',
        code: material.code || '',
        category: material.category || '',
        subcategory: material.subcategory || '',
        description: material.description || '',
        unit: material.unit || '',
        unitPrice: material.unitPrice || '',
        minStock: material.minStock || '',
        maxStock: material.maxStock || '',
        quantity: material.quantity || '',
        location: material.location || '',
        supplier: material.supplier?._id || '',
        status: material.status || 'active'
      });
    } else {
      setFormData({
        name: '',
        code: '',
        category: '',
        subcategory: '',
        description: '',
        unit: '',
        unitPrice: '',
        minStock: '',
        maxStock: '',
        quantity: '',
        location: '',
        supplier: '',
        status: 'active'
      });
    }
    
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedMaterial(null);
    setFormData({
      name: '',
      code: '',
      category: '',
      subcategory: '',
      description: '',
      unit: '',
      unitPrice: '',
      minStock: '',
      maxStock: '',
      quantity: '',
      location: '',
      supplier: '',
      status: 'active'
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (modalMode === 'add') {
        await api.post('/api/materials', formData);
        toast.success('Malzeme başarıyla eklendi');
      } else if (modalMode === 'edit') {
        await api.put(`/api/materials/${selectedMaterial._id}`, formData);
        toast.success('Malzeme başarıyla güncellendi');
      }
      
      handleCloseModal();
      fetchMaterials();
    } catch (error) {
      console.error('Material save error:', error);
      toast.error(error.response?.data?.message || 'İşlem başarısız');
    }
  };

  const handleDelete = async (materialId) => {
    if (window.confirm('Bu malzemeyi silmek istediğinizden emin misiniz?')) {
      try {
        await api.delete(`/api/materials/${materialId}`);
        toast.success('Malzeme başarıyla silindi');
        fetchMaterials();
      } catch (error) {
        console.error('Material delete error:', error);
        toast.error(error.response?.data?.message || 'Silme işlemi başarısız');
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getStockBadge = (material) => {
    if (material.currentStock === 0) {
      return <Badge bg="danger">Tükendi</Badge>;
    } else if (material.currentStock <= material.minStock) {
      return <Badge bg="warning">Düşük</Badge>;
    } else if (material.currentStock >= material.maxStock) {
      return <Badge bg="info">Fazla</Badge>;
    }
    return <Badge bg="success">Normal</Badge>;
  };

  const exportToExcel = async () => {
    try {
      const response = await api.get('/api/reports/stock-report?format=excel', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `malzemeler-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Excel dosyası indirildi');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Dışa aktarma başarısız');
    }
  };

  if (loading && materials.length === 0) {
    return <LoadingSpinner text="Malzemeler yükleniyor..." />;
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-0">Malzeme Yönetimi</h1>
              <p className="text-muted">Stok malzemelerini yönetin</p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-success" onClick={exportToExcel}>
                <FaDownload className="me-1" />
                Excel İndir
              </Button>
              {hasPermission('canManageMaterials') && (
                <Button variant="primary" onClick={() => handleShowModal('add')}>
                  <FaPlus className="me-1" />
                  Yeni Malzeme
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Filters */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Row className="g-3">
                <Col md={4}>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Malzeme ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                
                <Col md={2}>
                  <Form.Select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                  >
                    <option value="">Tüm Kategoriler</option>
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                  </Form.Select>
                </Col>
                
                <Col md={2}>
                  <Form.Select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                    <option value="discontinued">Durdurulmuş</option>
                  </Form.Select>
                </Col>
                
                <Col md={2}>
                  <Form.Select
                    value={filters.stockLevel}
                    onChange={(e) => handleFilterChange('stockLevel', e.target.value)}
                  >
                    <option value="all">Tüm Stoklar</option>
                    <option value="low">Düşük Stok</option>
                    <option value="out">Tükenen</option>
                    <option value="overstock">Fazla Stok</option>
                  </Form.Select>
                </Col>
                
                <Col md={2}>
                  <Form.Select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-');
                      setSortBy(field);
                      setSortOrder(order);
                    }}
                  >
                    <option value="name-asc">İsim A-Z</option>
                    <option value="name-desc">İsim Z-A</option>
                    <option value="currentStock-asc">Stok Azalan</option>
                    <option value="currentStock-desc">Stok Artan</option>
                    <option value="unitPrice-asc">Fiyat Azalan</option>
                    <option value="unitPrice-desc">Fiyat Artan</option>
                  </Form.Select>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Materials Table */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              {loading ? (
                <div className="text-center py-5">
                  <LoadingSpinner size="sm" text="Yükleniyor..." />
                </div>
              ) : materials.length > 0 ? (
                <>
                  <Table responsive className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('code')}
                        >
                          Kod {sortBy === 'code' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('name')}
                        >
                          Malzeme Adı {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Kategori</th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('quantity')}
                        >
                          Stok {sortBy === 'quantity' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Birim</th>
                        <th 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSort('unitPrice')}
                        >
                          Birim Fiyat {sortBy === 'unitPrice' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </th>
                        <th>Toplam Değer</th>
                        <th>Durum</th>
                        <th>Stok Durumu</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((material) => (
                        <tr key={material._id}>
                          <td className="fw-bold">{material.code}</td>
                          <td>
                            <div>
                              <div className="fw-semibold">{material.name}</div>
                              {material.description && (
                                <small className="text-muted">
                                  {material.description.substring(0, 50)}
                                  {material.description.length > 50 && '...'}
                                </small>
                              )}
                            </div>
                          </td>
                          <td>
                            <Badge bg="secondary">{material.category}</Badge>
                          </td>
                          <td className="fw-bold">
                            {material.quantity}
                            {material.quantity <= material.minStock && material.quantity > 0 && (
                              <FaExclamationTriangle className="text-warning ms-1" />
                            )}
                          </td>
                          <td>{material.unit}</td>
                          <td>{material.unitPrice?.toLocaleString('tr-TR')} ₺</td>
                          <td className="fw-bold">
                            {(material.quantity * material.unitPrice)?.toLocaleString('tr-TR')} ₺
                          </td>
                          <td>
                            <Badge bg={material.status === 'active' ? 'success' : 'secondary'}>
                              {material.status === 'active' ? 'Aktif' : 'Pasif'}
                            </Badge>
                          </td>
                          <td>
                            <Badge 
                              bg={material.quantity === 0 ? 'danger' : 
                                 material.quantity <= material.minStock ? 'warning' : 
                                 material.quantity >= material.maxStock ? 'info' : 'success'}
                            >
                              {material.quantity === 0 ? 'Tükendi' : 
                               material.quantity <= material.minStock ? 'Düşük' : 
                               material.quantity >= material.maxStock ? 'Fazla' : 'Normal'}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => handleShowModal('view', material)}
                              >
                                <FaEye />
                              </Button>
                              {hasPermission('canManageMaterials') && (
                                <>
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleShowModal('edit', material)}
                                  >
                                    <FaEdit />
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleDelete(material._id)}
                                  >
                                    <FaTrash />
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  
                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="d-flex justify-content-between align-items-center p-3">
                      <div className="text-muted">
                        Toplam {pagination.total} malzemeden {((pagination.page - 1) * pagination.limit) + 1}-
                        {Math.min(pagination.page * pagination.limit, pagination.total)} arası gösteriliyor
                      </div>
                      <Pagination className="mb-0">
                        <Pagination.Prev 
                          disabled={pagination.page === 1}
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        />
                        {[...Array(pagination.pages)].map((_, index) => (
                          <Pagination.Item
                            key={index + 1}
                            active={pagination.page === index + 1}
                            onClick={() => setPagination(prev => ({ ...prev, page: index + 1 }))}
                          >
                            {index + 1}
                          </Pagination.Item>
                        ))}
                        <Pagination.Next 
                          disabled={pagination.page === pagination.pages}
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        />
                      </Pagination>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-5">
                  <FaBoxes size={48} className="text-muted mb-3" />
                  <h5 className="text-muted">Malzeme bulunamadı</h5>
                  <p className="text-muted">Arama kriterlerinizi değiştirin veya yeni malzeme ekleyin.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Material Modal */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {modalMode === 'add' ? 'Yeni Malzeme Ekle' : 
             modalMode === 'edit' ? 'Malzeme Düzenle' : 'Malzeme Detayları'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Malzeme Adı *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    disabled={modalMode === 'view'}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Malzeme Kodu *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                    disabled={modalMode === 'view'}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Kategori *</Form.Label>
                  <Form.Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    disabled={modalMode === 'view'}
                  >
                    <option value="">Kategori seçin</option>
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>{category.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Alt Kategori *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    required
                    disabled={modalMode === 'view'}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Birim *</Form.Label>
                  <Form.Select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                    disabled={modalMode === 'view'}
                  >
                    <option value="">Birim seçin</option>
                    <option value="adet">Adet</option>
                    <option value="metre">Metre</option>
                    <option value="kg">Kilogram</option>
                    <option value="litre">Litre</option>
                    <option value="paket">Paket</option>
                    <option value="kutu">Kutu</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Birim Fiyat (₺) *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    required
                    disabled={modalMode === 'view'}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Min Stok *</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    required
                    disabled={modalMode === 'view'}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Max Stok *</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.maxStock}
                    onChange={(e) => setFormData({ ...formData, maxStock: e.target.value })}
                    required
                    disabled={modalMode === 'view'}
                  />
                </Form.Group>
              </Col>
              {modalMode === 'add' && (
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Başlangıç Stok</Form.Label>
                    <Form.Control
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    />
                  </Form.Group>
                </Col>
              )}
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Konum</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    disabled={modalMode === 'view'}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Durum</Form.Label>
                  <Form.Select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    disabled={modalMode === 'view'}
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Pasif</option>
                    <option value="discontinued">Durdurulmuş</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group>
                  <Form.Label>Açıklama</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={modalMode === 'view'}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              {modalMode === 'view' ? 'Kapat' : 'İptal'}
            </Button>
            {modalMode !== 'view' && (
              <Button variant="primary" type="submit">
                {modalMode === 'add' ? 'Ekle' : 'Güncelle'}
              </Button>
            )}
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Materials;