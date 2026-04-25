from django.urls import path
from . import views

urlpatterns = [
    # API endpoints
    path('api/resources/', views.ResourceListView.as_view(), name='resource-list'),
    path('api/resources/<int:pk>/', views.ResourceDetailView.as_view(), name='resource-detail'),
    path('api/resources/<int:pk>/bookmark/', views.BookmarkView.as_view(), name='bookmark'),
    path('api/bookmarks/', views.BookmarkView.as_view(), name='bookmark-list'),
    path('api/resources/<int:pk>/progress/', views.ProgressView.as_view(), name='progress'),
    path('api/skill-gaps/', views.CVSkillGapView.as_view(), name='skill-gaps'),
    path('api/categories/', views.CategoryStatsView.as_view(), name='categories'),
    path('api/youtube/search/', views.YouTubeSearchView.as_view(), name='youtube-search'),

    # Template views
    path('', views.index_view, name='index'),
    path('category/<str:category>/', views.category_view, name='category'),
    path('bookmarks/', views.bookmarks_view, name='bookmarks'),
    path('skill-gaps/', views.skill_gaps_view, name='skill-gaps-page'),
]