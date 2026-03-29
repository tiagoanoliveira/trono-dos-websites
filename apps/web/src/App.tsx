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
import { ProporCategoriaPage } from '@/pages/ProporCategoriaPage';
import { IdeaHubPage } from '@/pages/IdeaHubPage';
import { IdeaDetailPage } from '@/pages/IdeaDetailPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { ComparisonPage } from '@/pages/ComparisonPage';
import { AdminPage } from '@/pages/AdminPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="categoria/*" element={<CategoryPage />} />
        <Route path="website/:id" element={<WebsitePage />} />
        <Route path="pesquisa" element={<SearchPage />} />
        <Route path="entrar" element={<LoginPage />} />
        <Route path="registar" element={<RegisterPage />} />
        <Route path="esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="propor" element={<ProporWebsitePage />} />
        <Route path="propor-categoria" element={<ProporCategoriaPage />} />
        <Route path="ideias" element={<IdeaHubPage />} />
        <Route path="ideias/:id" element={<IdeaDetailPage />} />
        <Route path="perfil" element={<ProfilePage />} />
        <Route path="comparativo" element={<ComparisonPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
