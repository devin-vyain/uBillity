from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from app.views import BillViewSet, HouseholdViewSet
from django.contrib import admin
from django.views.generic import TemplateView

router = DefaultRouter()
router.register(r'bills', BillViewSet, basename='bill')
router.register(r'households', HouseholdViewSet, basename='household')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/login/', obtain_auth_token),
    path('', TemplateView.as_view(template_name='index.html'), name='frontend'),
    re_path(
        r'^(?!api/|admin/|assets/|uBillity\.svg$).*$',
        TemplateView.as_view(template_name='index.html'),
        name='frontend-fallback',
    ),
]