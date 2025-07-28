import React, { useState } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Alert,
  Badge,
  Tab,
  Tabs
} from 'react-bootstrap';
import {
  FaUser,
  FaKey,
  FaEdit,
  FaSave,
  FaTimes,
  FaEye,
  FaEyeSlash,
  FaShieldAlt
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const Profile = () => {
  // Temporary user data - replace with actual user management
  const user = {
    name: 'Test User',
    email: 'test@example.com',
    role: 'admin',
    department: 'Bilgi İşlem'
  };
  
  // Temporary functions - replace with actual API calls
  const updateProfile = async (data) => {
    return Promise.resolve();
  };
  
  const changePassword = async (data) => {
    return Promise.resolve();
  };
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  // Profile form data
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    department: user?.department || ''
  });
  
  // Password form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const departments = [
    'Genel Müdürlük',
    'İnsan Kaynakları',
    'Muhasebe',
    'Satış',
    'Pazarlama',
    'Üretim',
    'Kalite Kontrol',
    'Lojistik',
    'Bilgi İşlem',
    'Ar-Ge'
  ];

  const permissionLabels = {
    canViewDashboard: 'Dashboard Görüntüleme',
    canViewMaterials: 'Malzeme Görüntüleme',
    canManageMaterials: 'Malzeme Yönetimi',
    canViewTransactions: 'İşlem Görüntüleme',
    canManageTransactions: 'İşlem Yönetimi',
    canViewReports: 'Rapor Görüntüleme',
    canManageUsers: 'Kullanıcı Yönetimi',
    canManageSettings: 'Sistem Ayarları'
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await updateProfile(profileData);
      setEditMode(false);
      toast.success('Profil başarıyla güncellendi');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error('Profil güncellenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Yeni şifreler eşleşmiyor');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır');
      return;
    }
    
    try {
      setLoading(true);
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast.success('Şifre başarıyla değiştirildi');
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(error.response?.data?.message || 'Şifre değiştirilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileData({
      name: user?.name || '',
      email: user?.email || '',
      department: user?.department || ''
    });
    setEditMode(false);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <Badge bg="danger">Admin</Badge>;
      case 'manager':
        return <Badge bg="warning">Yönetici</Badge>;
      case 'user':
        return <Badge bg="primary">Kullanıcı</Badge>;
      default:
        return <Badge bg="secondary">{role}</Badge>;
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!user) {
    return <LoadingSpinner text="Profil yükleniyor..." />;
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center">
            <div className="avatar-lg bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3">
              <FaUser size={24} />
            </div>
            <div>
              <h1 className="h3 mb-0">{user.name}</h1>
              <p className="text-muted mb-0">{user.email}</p>
              <div className="mt-1">
                {getRoleBadge(user.role)}
                {user.department && (
                  <Badge bg="info" className="ms-2">{user.department}</Badge>
                )}
              </div>
            </div>
          </div>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4"
              >
                <Tab eventKey="profile" title="Profil Bilgileri">
                  <Form onSubmit={handleProfileSubmit}>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Ad Soyad</Form.Label>
                          <Form.Control
                            type="text"
                            value={profileData.name}
                            onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                            disabled={!editMode}
                            required
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>E-posta</Form.Label>
                          <Form.Control
                            type="email"
                            value={profileData.email}
                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                            disabled={!editMode}
                            required
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Departman</Form.Label>
                          <Form.Select
                            value={profileData.department}
                            onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                            disabled={!editMode}
                          >
                            <option value="">Departman seçin</option>
                            {departments.map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Rol</Form.Label>
                          <div className="pt-2">
                            {getRoleBadge(user.role)}
                          </div>
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Kayıt Tarihi</Form.Label>
                          <Form.Control
                            type="text"
                            value={new Date(user.createdAt).toLocaleDateString('tr-TR')}
                            disabled
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Son Giriş</Form.Label>
                          <Form.Control
                            type="text"
                            value={user.lastLogin ? new Date(user.lastLogin).toLocaleString('tr-TR') : 'İlk giriş'}
                            disabled
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <div className="mt-4">
                      {!editMode ? (
                        <Button variant="primary" onClick={() => setEditMode(true)}>
                          <FaEdit className="me-1" />
                          Düzenle
                        </Button>
                      ) : (
                        <div className="d-flex gap-2">
                          <Button 
                            variant="success" 
                            type="submit"
                            disabled={loading}
                          >
                            {loading ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <><FaSave className="me-1" />Kaydet</>
                            )}
                          </Button>
                          <Button 
                            variant="secondary" 
                            onClick={handleCancelEdit}
                            disabled={loading}
                          >
                            <FaTimes className="me-1" />
                            İptal
                          </Button>
                        </div>
                      )}
                    </div>
                  </Form>
                </Tab>
                
                <Tab eventKey="password" title="Şifre Değiştir">
                  <Form onSubmit={handlePasswordSubmit}>
                    <Row className="g-3">
                      <Col md={12}>
                        <Alert variant="info">
                          <FaKey className="me-2" />
                          Güvenliğiniz için şifrenizi düzenli olarak değiştirmenizi öneririz.
                        </Alert>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Mevcut Şifre</Form.Label>
                          <div className="position-relative">
                            <Form.Control
                              type={showPasswords.current ? 'text' : 'password'}
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                              required
                            />
                            <Button
                              variant="link"
                              className="position-absolute end-0 top-0 border-0 bg-transparent"
                              style={{ zIndex: 10 }}
                              onClick={() => togglePasswordVisibility('current')}
                            >
                              {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                            </Button>
                          </div>
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Yeni Şifre</Form.Label>
                          <div className="position-relative">
                            <Form.Control
                              type={showPasswords.new ? 'text' : 'password'}
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                              required
                              minLength={6}
                            />
                            <Button
                              variant="link"
                              className="position-absolute end-0 top-0 border-0 bg-transparent"
                              style={{ zIndex: 10 }}
                              onClick={() => togglePasswordVisibility('new')}
                            >
                              {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                            </Button>
                          </div>
                          <Form.Text className="text-muted">
                            En az 6 karakter olmalıdır.
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Yeni Şifre (Tekrar)</Form.Label>
                          <div className="position-relative">
                            <Form.Control
                              type={showPasswords.confirm ? 'text' : 'password'}
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                              required
                              className={passwordData.newPassword && passwordData.confirmPassword && 
                                passwordData.newPassword !== passwordData.confirmPassword ? 'is-invalid' : ''}
                            />
                            <Button
                              variant="link"
                              className="position-absolute end-0 top-0 border-0 bg-transparent"
                              style={{ zIndex: 10 }}
                              onClick={() => togglePasswordVisibility('confirm')}
                            >
                              {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                            </Button>
                          </div>
                          {passwordData.newPassword && passwordData.confirmPassword && 
                           passwordData.newPassword !== passwordData.confirmPassword && (
                            <div className="invalid-feedback">
                              Şifreler eşleşmiyor.
                            </div>
                          )}
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <div className="mt-4">
                      <Button 
                        variant="warning" 
                        type="submit"
                        disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || 
                          passwordData.newPassword !== passwordData.confirmPassword}
                      >
                        {loading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <><FaKey className="me-1" />Şifreyi Değiştir</>
                        )}
                      </Button>
                    </div>
                  </Form>
                </Tab>
                
                <Tab eventKey="permissions" title="Yetkiler">
                  <Row className="g-3">
                    <Col md={12}>
                      <Alert variant="info">
                        <FaShieldAlt className="me-2" />
                        Aşağıda hesabınıza tanımlı yetkiler listelenmektedir. Yetki değişiklikleri için sistem yöneticinize başvurun.
                      </Alert>
                    </Col>
                    
                    <Col md={12}>
                      <Card className="border-0 bg-light">
                        <Card.Body>
                          <h6 className="mb-3">Mevcut Yetkiler</h6>
                          <Row className="g-2">
                            {Object.entries(user.permissions || {}).map(([key, value]) => (
                              <Col md={6} key={key}>
                                <div className="d-flex align-items-center">
                                  <Badge 
                                    bg={value ? 'success' : 'secondary'} 
                                    className="me-2"
                                  >
                                    {value ? '✓' : '✗'}
                                  </Badge>
                                  <span className={value ? '' : 'text-muted'}>
                                    {permissionLabels[key] || key}
                                  </span>
                                </div>
                              </Col>
                            ))}
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>
                    
                    <Col md={12}>
                      <Card className="border-0 bg-light">
                        <Card.Body>
                          <h6 className="mb-3">Hesap Bilgileri</h6>
                          <Row className="g-3">
                            <Col md={6}>
                              <strong>Kullanıcı ID:</strong>
                              <p className="text-muted mb-0">{user._id}</p>
                            </Col>
                            <Col md={6}>
                              <strong>Hesap Durumu:</strong>
                              <p className="mb-0">
                                <Badge bg={user.isActive ? 'success' : 'danger'}>
                                  {user.isActive ? 'Aktif' : 'Pasif'}
                                </Badge>
                              </p>
                            </Col>
                            <Col md={6}>
                              <strong>Toplam Giriş:</strong>
                              <p className="text-muted mb-0">{user.loginCount || 0} kez</p>
                            </Col>
                            <Col md={6}>
                              <strong>Hesap Oluşturma:</strong>
                              <p className="text-muted mb-0">
                                {new Date(user.createdAt).toLocaleDateString('tr-TR')}
                              </p>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Tab>
              </Tabs>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Profile;