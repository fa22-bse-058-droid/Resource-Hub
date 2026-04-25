from rest_framework import serializers
from .models import Resource, Bookmark, UserProgress, CVSkillGap


class ResourceSerializer(serializers.ModelSerializer):
    is_bookmarked = serializers.SerializerMethodField()
    user_progress = serializers.SerializerMethodField()
    tags_list     = serializers.SerializerMethodField()

    class Meta:
        model  = Resource
        fields = [
            'id', 'title', 'description', 'url', 'platform',
            'category', 'level', 'resource_type', 'is_free',
            'thumbnail_url', 'youtube_video_id', 'duration',
            'tags', 'tags_list', 'view_count', 'created_at',
            'is_bookmarked', 'user_progress'
        ]

    def get_is_bookmarked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Bookmark.objects.filter(user=request.user, resource=obj).exists()
        return False

    def get_user_progress(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            progress = UserProgress.objects.filter(user=request.user, resource=obj).first()
            return progress.status if progress else 'NOT_STARTED'
        return None

    def get_tags_list(self, obj):
        return obj.get_tags_list()


class BookmarkSerializer(serializers.ModelSerializer):
    resource = ResourceSerializer(read_only=True)

    class Meta:
        model  = Bookmark
        fields = ['id', 'resource', 'created_at']


class UserProgressSerializer(serializers.ModelSerializer):
    resource = ResourceSerializer(read_only=True)

    class Meta:
        model  = UserProgress
        fields = ['id', 'resource', 'status', 'completed_at']


class CVSkillGapSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CVSkillGap
        fields = ['id', 'skill_name', 'created_at']