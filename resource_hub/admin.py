from django.contrib import admin
from .models import Resource, Bookmark, UserProgress, CVSkillGap


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display  = ['title', 'platform', 'category', 'level', 'resource_type', 'view_count']
    list_filter   = ['category', 'level', 'platform', 'resource_type']
    search_fields = ['title', 'description', 'tags']


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ['user', 'resource', 'created_at']


@admin.register(UserProgress)
class UserProgressAdmin(admin.ModelAdmin):
    list_display = ['user', 'resource', 'status', 'completed_at']


@admin.register(CVSkillGap)
class CVSkillGapAdmin(admin.ModelAdmin):
    list_display = ['user', 'skill_name', 'created_at']