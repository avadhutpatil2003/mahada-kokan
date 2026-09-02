from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MhadaPlotViewSet

router = DefaultRouter()
router.register(r'plots', MhadaPlotViewSet, basename='plot')

urlpatterns = [
    path('', include(router.urls)),
]
