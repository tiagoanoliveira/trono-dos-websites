import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { CategoryPage } from '@/pages/CategoryPage';
import { WebsitePage } from '@/pages/WebsitePage';
import { SearchPage } from '@/pages/SearchPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { ProporWebsitePage } from '@/pages/ProporWebsitePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="categoria/:slug" element={<CategoryPage />} />
        <Route path="website/:id" element={<WebsitePage />} />
        <Route path="pesquisa" element={<SearchPage />} />
        <Route path="entrar" element={<LoginPage />} />
        <Route path="registar" element={<RegisterPage />} />
        <Route path="esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="propor" element={<ProporWebsitePage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
