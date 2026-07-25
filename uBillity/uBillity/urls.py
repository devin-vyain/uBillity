from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from app.views import BillViewSet, HouseholdViewSet
from django.contrib import admin

router = DefaultRouter()
router.register(r'bills', BillViewSet, basename='bill')
router.register(r'households', HouseholdViewSet, basename='household')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/login/', obtain_auth_token),
]