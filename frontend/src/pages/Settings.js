import React, { useState, useEffect } from 'react';
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
  Tabs,
  Table,
  Modal
} from 'react-bootstrap';
import {
  FaCog,
  FaDatabase,
  FaBell,
  FaShieldAlt,
  FaSave,
  FaDownload,
  FaUpload,
  FaTrash,
  FaExclamationTriangle
} from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/LoadingSpinner';

const Settings = () => {
  // Temporary user data and permission check
  const user = { role: 'admin', name: 'Test User' };
  const hasPermission = () => true;
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  
  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'Stok Yönetim Sistemi',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    currency: 'TRY',
    language: 'tr',
    timezone: 'Europe/Istanbul',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'tr-TR'
  });
  
  // Stock Settings
  const [stockSettings, setStockSettings] = useState({
    lowStockThreshold: 10,
    criticalStockThreshold: 5,
    autoReorderEnabled: false,
    autoReorderQuantity: 50,
    stockValuationMethod: 'FIFO', // FIFO, LIFO, Average
    allowNegativeStock: false,
    requireApprovalForAdjustments: true
  });
  
  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    lowStockAlerts: true,
    criticalStockAlerts: true,
    newUserRegistration: true,
    systemMaintenance: true,
    dailyReports: false,
    weeklyReports: true,
    monthlyReports: true
  });
  
  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    passwordMinLength: 6,
    passwordRequireUppercase: false,
    passwordRequireNumbers: false,
    passwordRequireSpecialChars: false,
    sessionTimeout: 60, // minutes
    maxLoginAttempts: 5,
    lockoutDuration: 15, // minutes
    twoFactorEnabled: false
  });
  
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalMaterials: 0,
    totalTransactions: 0,
    databaseSize: '0 MB',
    lastBackup: null,
    systemUptime: '0 days'
  });

  useEffect(() => {
    if (hasPermission('canManageSettings')) {
      fetchSettings();
      fetchSystemStats();
    }
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/api/settings');
      const settings = response.data;
      
      setGeneralSettings(settings.general || generalSettings);
      setStockSettings(settings.stock || stockSettings);
      setNotificationSettings(settings.notifications || notificationSettings);
      setSecuritySettings(settings.security || securitySettings);
    } catch (error) {
      console.error('Settings fetch error:', error);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const response = await api.get('/api/settings/system-stats');
      setSystemStats(response.data);
    } catch (error) {
      console.error('System stats fetch error:', error);
    }
  };

  const saveSettings = async (category, settings) => {
    try {
      setLoading(true);
      await api.put('/api/settings', {
        category,
        settings
      });
      toast.success('Ayarlar başarıyla kaydedildi');
    } catch (error) {
      console.error('Settings save error:', error);
      toast.error('Ayarlar kaydedilirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/settings/backup', {}, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Yedek başarıyla oluşturuldu');
      setShowBackupModal(false);
      fetchSystemStats();
    } catch (error) {
      console.error('Backup error:', error);
      toast.error('Yedek oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleFileRestore = async (file) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('backup', file);
      
      await api.post('/api/settings/restore', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Sistem başarıyla geri yüklendi');
      setShowRestoreModal(false);
      // Reload page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error('Restore error:', error);
      toast.error('Geri yükleme sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const clearSystemLogs = async () => {
    if (window.confirm('Sistem loglarını temizlemek istediğinizden emin misiniz?')) {
      try {
        await api.delete('/api/settings/logs');
        toast.success('Sistem logları temizlendi');
        fetchSystemStats();
      } catch (error) {
        console.error('Clear logs error:', error);
        toast.error('Loglar temizlenirken hata oluştu');
      }
    }
  };

  if (!hasPermission('canManageSettings')) {
    return (
      <Container fluid className="py-4">
        <Alert variant="warning">
          <h5>Yetkisiz Erişim</h5>
          <p>Sistem ayarlarını yönetme yetkiniz bulunmamaktadır.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h1 className="h3 mb-0">Sistem Ayarları</h1>
              <p className="text-muted">Sistem yapılandırmasını yönetin</p>
            </div>
            <div className="d-flex align-items-center gap-2">
              <FaCog className="text-muted" />
              <span className="text-muted">v1.0.0</span>
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
                <Tab eventKey="general" title="Genel Ayarlar">
                  <Form onSubmit={(e) => {
                    e.preventDefault();
                    saveSettings('general', generalSettings);
                  }}>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Şirket Adı</Form.Label>
                          <Form.Control
                            type="text"
                            value={generalSettings.companyName}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, companyName: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Para Birimi</Form.Label>
                          <Form.Select
                            value={generalSettings.currency}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
                          >
                            <option value="TRY">Türk Lirası (₺)</option>
                            <option value="USD">Amerikan Doları ($)</option>
                            <option value="EUR">Euro (€)</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      
                      <Col md={12}>
                        <Form.Group>
                          <Form.Label>Şirket Adresi</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={generalSettings.companyAddress}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, companyAddress: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Telefon</Form.Label>
                          <Form.Control
                            type="text"
                            value={generalSettings.companyPhone}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, companyPhone: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>E-posta</Form.Label>
                          <Form.Control
                            type="email"
                            value={generalSettings.companyEmail}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, companyEmail: e.target.value })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Dil</Form.Label>
                          <Form.Select
                            value={generalSettings.language}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, language: e.target.value })}
                          >
                            <option value="tr">Türkçe</option>
                            <option value="en">English</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Zaman Dilimi</Form.Label>
                          <Form.Select
                            value={generalSettings.timezone}
                            onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                          >
                            <option value="Europe/Istanbul">İstanbul</option>
                            <option value="Europe/London">Londra</option>
                            <option value="America/New_York">New York</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <div className="mt-4">
                      <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? <LoadingSpinner size="sm" /> : <FaSave className="me-1" />}
                        Kaydet
                      </Button>
                    </div>
                  </Form>
                </Tab>
                
                <Tab eventKey="stock" title="Stok Ayarları">
                  <Form onSubmit={(e) => {
                    e.preventDefault();
                    saveSettings('stock', stockSettings);
                  }}>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Düşük Stok Eşiği</Form.Label>
                          <Form.Control
                            type="number"
                            value={stockSettings.lowStockThreshold}
                            onChange={(e) => setStockSettings({ ...stockSettings, lowStockThreshold: parseInt(e.target.value) })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Kritik Stok Eşiği</Form.Label>
                          <Form.Control
                            type="number"
                            value={stockSettings.criticalStockThreshold}
                            onChange={(e) => setStockSettings({ ...stockSettings, criticalStockThreshold: parseInt(e.target.value) })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Stok Değerleme Yöntemi</Form.Label>
                          <Form.Select
                            value={stockSettings.stockValuationMethod}
                            onChange={(e) => setStockSettings({ ...stockSettings, stockValuationMethod: e.target.value })}
                          >
                            <option value="FIFO">İlk Giren İlk Çıkar (FIFO)</option>
                            <option value="LIFO">Son Giren İlk Çıkar (LIFO)</option>
                            <option value="Average">Ağırlıklı Ortalama</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Otomatik Sipariş Miktarı</Form.Label>
                          <Form.Control
                            type="number"
                            value={stockSettings.autoReorderQuantity}
                            onChange={(e) => setStockSettings({ ...stockSettings, autoReorderQuantity: parseInt(e.target.value) })}
                            disabled={!stockSettings.autoReorderEnabled}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={12}>
                        <Form.Group>
                          <Form.Check
                            type="checkbox"
                            id="autoReorderEnabled"
                            label="Otomatik yeniden sipariş etkin"
                            checked={stockSettings.autoReorderEnabled}
                            onChange={(e) => setStockSettings({ ...stockSettings, autoReorderEnabled: e.target.checked })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={12}>
                        <Form.Group>
                          <Form.Check
                            type="checkbox"
                            id="allowNegativeStock"
                            label="Negatif stoka izin ver"
                            checked={stockSettings.allowNegativeStock}
                            onChange={(e) => setStockSettings({ ...stockSettings, allowNegativeStock: e.target.checked })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={12}>
                        <Form.Group>
                          <Form.Check
                            type="checkbox"
                            id="requireApprovalForAdjustments"
                            label="Stok düzeltmeleri için onay gerekli"
                            checked={stockSettings.requireApprovalForAdjustments}
                            onChange={(e) => setStockSettings({ ...stockSettings, requireApprovalForAdjustments: e.target.checked })}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <div className="mt-4">
                      <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? <LoadingSpinner size="sm" /> : <FaSave className="me-1" />}
                        Kaydet
                      </Button>
                    </div>
                  </Form>
                </Tab>
                
                <Tab eventKey="notifications" title="Bildirimler">
                  <Form onSubmit={(e) => {
                    e.preventDefault();
                    saveSettings('notifications', notificationSettings);
                  }}>
                    <Row className="g-3">
                      <Col md={12}>
                        <h6>E-posta Bildirimleri</h6>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Check
                            type="checkbox"
                            id="emailNotifications"
                            label="E-posta bildirimlerini etkinleştir"
                            checked={notificationSettings.emailNotifications}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Check
                            type="checkbox"
                            id="lowStockAlerts"
                            label="Düşük stok uyarıları"
                            checked={notificationSettings.lowStockAlerts}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, lowStockAlerts: e.target.checked })}
                            disabled={!notificationSettings.emailNotifications}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Check
                            type="checkbox"
                            id="criticalStockAlerts"
                            label="Kritik stok uyarıları"
                            checked={notificationSettings.criticalStockAlerts}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, criticalStockAlerts: e.target.checked })}
                            disabled={!notificationSettings.emailNotifications}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Check
                            type="checkbox"
                            id="newUserRegistration"
                            label="Yeni kullanıcı kayıtları"
                            checked={notificationSettings.newUserRegistration}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, newUserRegistration: e.target.checked })}
                            disabled={!notificationSettings.emailNotifications}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={12}>
                        <hr />
                        <h6>Rapor Bildirimleri</h6>
                      </Col>
                      
                      <Col md={4}>
                        <Form.Group>
                          <Form.Check
                            type="checkbox"
                            id="dailyReports"
                            label="Günlük raporlar"
                            checked={notificationSettings.dailyReports}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, dailyReports: e.target.checked })}
                            disabled={!notificationSettings.emailNotifications}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={4}>
                        <Form.Group>
                          <Form.Check
                            type="checkbox"
                            id="weeklyReports"
                            label="Haftalık raporlar"
                            checked={notificationSettings.weeklyReports}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, weeklyReports: e.target.checked })}
                            disabled={!notificationSettings.emailNotifications}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={4}>
                        <Form.Group>
                          <Form.Check
                            type="checkbox"
                            id="monthlyReports"
                            label="Aylık raporlar"
                            checked={notificationSettings.monthlyReports}
                            onChange={(e) => setNotificationSettings({ ...notificationSettings, monthlyReports: e.target.checked })}
                            disabled={!notificationSettings.emailNotifications}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <div className="mt-4">
                      <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? <LoadingSpinner size="sm" /> : <FaSave className="me-1" />}
                        Kaydet
                      </Button>
                    </div>
                  </Form>
                </Tab>
                
                <Tab eventKey="security" title="Güvenlik">
                  <Form onSubmit={(e) => {
                    e.preventDefault();
                    saveSettings('security', securitySettings);
                  }}>
                    <Row className="g-3">
                      <Col md={12}>
                        <h6>Şifre Politikası</h6>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Minimum Şifre Uzunluğu</Form.Label>
                          <Form.Control
                            type="number"
                            min="4"
                            max="20"
                            value={securitySettings.passwordMinLength}
                            onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: parseInt(e.target.value) })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Oturum Zaman Aşımı (dakika)</Form.Label>
                          <Form.Control
                            type="number"
                            min="15"
                            max="480"
                            value={securitySettings.sessionTimeout}
                            onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Maksimum Giriş Denemesi</Form.Label>
                          <Form.Control
                            type="number"
                            min="3"
                            max="10"
                            value={securitySettings.maxLoginAttempts}
                            onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label>Hesap Kilitleme Süresi (dakika)</Form.Label>
                          <Form.Control
                            type="number"
                            min="5"
                            max="60"
                            value={securitySettings.lockoutDuration}
                            onChange={(e) => setSecuritySettings({ ...securitySettings, lockoutDuration: parseInt(e.target.value) })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={12}>
                        <Form.Group>
                          <Form.Check
                            type="checkbox"
                            id="passwordRequireUppercase"
                            label="Büyük harf zorunlu"
                            checked={securitySettings.passwordRequireUppercase}
                            onChange={(e) => setSecuritySettings({ ...securitySettings, passwordRequireUppercase: e.target.checked })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={12}>
                        <Form.Group>
                          <Form.Check
                            type="checkbox"
                            id="passwordRequireNumbers"
                            label="Rakam zorunlu"
                            checked={securitySettings.passwordRequireNumbers}
                            onChange={(e) => setSecuritySettings({ ...securitySettings, passwordRequireNumbers: e.target.checked })}
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={12}>
                        <Form.Group>
                          <Form.Check
                            type="checkbox"
                            id="passwordRequireSpecialChars"
                            label="Özel karakter zorunlu"
                            checked={securitySettings.passwordRequireSpecialChars}
                            onChange={(e) => setSecuritySettings({ ...securitySettings, passwordRequireSpecialChars: e.target.checked })}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    
                    <div className="mt-4">
                      <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? <LoadingSpinner size="sm" /> : <FaSave className="me-1" />}
                        Kaydet
                      </Button>
                    </div>
                  </Form>
                </Tab>
                
                <Tab eventKey="system" title="Sistem">
                  <Row className="g-4">
                    <Col md={12}>
                      <Card className="border-0 bg-light">
                        <Card.Body>
                          <h6 className="mb-3">Sistem İstatistikleri</h6>
                          <Table responsive>
                            <tbody>
                              <tr>
                                <td><strong>Toplam Kullanıcı:</strong></td>
                                <td>{systemStats.totalUsers}</td>
                              </tr>
                              <tr>
                                <td><strong>Toplam Malzeme:</strong></td>
                                <td>{systemStats.totalMaterials}</td>
                              </tr>
                              <tr>
                                <td><strong>Toplam İşlem:</strong></td>
                                <td>{systemStats.totalTransactions}</td>
                              </tr>
                              <tr>
                                <td><strong>Veritabanı Boyutu:</strong></td>
                                <td>{systemStats.databaseSize}</td>
                              </tr>
                              <tr>
                                <td><strong>Son Yedek:</strong></td>
                                <td>
                                  {systemStats.lastBackup 
                                    ? new Date(systemStats.lastBackup).toLocaleString('tr-TR')
                                    : 'Henüz yedek alınmamış'
                                  }
                                </td>
                              </tr>
                              <tr>
                                <td><strong>Sistem Çalışma Süresi:</strong></td>
                                <td>{systemStats.systemUptime}</td>
                              </tr>
                            </tbody>
                          </Table>
                        </Card.Body>
                      </Card>
                    </Col>
                    
                    <Col md={12}>
                      <Card className="border-0 bg-light">
                        <Card.Body>
                          <h6 className="mb-3">Yedekleme ve Geri Yükleme</h6>
                          <div className="d-flex gap-2 mb-3">
                            <Button 
                              variant="success" 
                              onClick={() => setShowBackupModal(true)}
                            >
                              <FaDownload className="me-1" />
                              Yedek Al
                            </Button>
                            <Button 
                              variant="warning" 
                              onClick={() => setShowRestoreModal(true)}
                            >
                              <FaUpload className="me-1" />
                              Geri Yükle
                            </Button>
                          </div>
                          <Alert variant="info">
                            <small>
                              <strong>Not:</strong> Yedekleme işlemi tüm sistem verilerini içerir. 
                              Geri yükleme işlemi mevcut verilerin üzerine yazacaktır.
                            </small>
                          </Alert>
                        </Card.Body>
                      </Card>
                    </Col>
                    
                    <Col md={12}>
                      <Card className="border-0 bg-light">
                        <Card.Body>
                          <h6 className="mb-3">Sistem Bakımı</h6>
                          <div className="d-flex gap-2">
                            <Button 
                              variant="outline-danger" 
                              onClick={clearSystemLogs}
                            >
                              <FaTrash className="me-1" />
                              Sistem Loglarını Temizle
                            </Button>
                          </div>
                          <Alert variant="warning" className="mt-3">
                            <FaExclamationTriangle className="me-2" />
                            <strong>Dikkat:</strong> Bu işlemler geri alınamaz. Lütfen dikkatli olun.
                          </Alert>
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

      {/* Backup Modal */}
      <Modal show={showBackupModal} onHide={() => setShowBackupModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Sistem Yedeği Al</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <FaDatabase className="me-2" />
            Sistem yedeği alınacak. Bu işlem birkaç dakika sürebilir.
          </Alert>
          <p>Yedek dosyası aşağıdaki verileri içerecek:</p>
          <ul>
            <li>Tüm kullanıcı hesapları</li>
            <li>Malzeme veritabanı</li>
            <li>İşlem geçmişi</li>
            <li>Sistem ayarları</li>
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBackupModal(false)}>
            İptal
          </Button>
          <Button variant="success" onClick={createBackup} disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : <FaDownload className="me-1" />}
            Yedek Al
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Restore Modal */}
      <Modal show={showRestoreModal} onHide={() => setShowRestoreModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Sistem Geri Yükle</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <FaExclamationTriangle className="me-2" />
            <strong>Dikkat:</strong> Bu işlem mevcut tüm verilerin üzerine yazacaktır!
          </Alert>
          <Form.Group>
            <Form.Label>Yedek Dosyası Seçin</Form.Label>
            <Form.Control
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleFileRestore(file);
                }
              }}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRestoreModal(false)}>
            İptal
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Settings;