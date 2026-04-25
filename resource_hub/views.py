from django.db.models import F as models_F
from django.shortcuts import render, get_object_or_404
from django.db.models import Q
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status
from .models import Resource, Bookmark, UserProgress, CVSkillGap
from .serializers import (
    ResourceSerializer, BookmarkSerializer,
    UserProgressSerializer, CVSkillGapSerializer
)
from .services.youtube_api import search_youtube_videos


class ResourceListView(ListAPIView):
    serializer_class   = ResourceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Resource.objects.filter(is_free=True)
        search        = self.request.query_params.get('search', '')
        category      = self.request.query_params.get('category', '')
        level         = self.request.query_params.get('level', '')
        resource_type = self.request.query_params.get('resource_type', '')
        platform      = self.request.query_params.get('platform', '')

        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search) |
                Q(tags__icontains=search) |
                Q(platform__icontains=search)
            )
        if category:
            queryset = queryset.filter(category=category)
        if level:
            queryset = queryset.filter(level=level)
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        if platform:
            queryset = queryset.filter(platform=platform)

        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        # increment view count
        queryset.update(view_count=models_F('view_count') + 1)
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'count':   queryset.count(),
            'results': serializer.data
        })


class ResourceDetailView(RetrieveAPIView):
    queryset           = Resource.objects.all()
    serializer_class   = ResourceSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context


class BookmarkView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookmarks  = Bookmark.objects.filter(user=request.user)
        serializer = BookmarkSerializer(bookmarks, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, pk=None):
        resource = get_object_or_404(Resource, pk=pk)
        bookmark, created = Bookmark.objects.get_or_create(user=request.user, resource=resource)
        if created:
            return Response({'message': 'Bookmarked!'}, status=status.HTTP_201_CREATED)
        return Response({'message': 'Already bookmarked'}, status=status.HTTP_200_OK)

    def delete(self, request, pk=None):
        resource = get_object_or_404(Resource, pk=pk)
        deleted  = Bookmark.objects.filter(user=request.user, resource=resource).delete()
        if deleted[0]:
            return Response({'message': 'Bookmark removed'}, status=status.HTTP_200_OK)
        return Response({'message': 'Not found'}, status=status.HTTP_404_NOT_FOUND)


class ProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        resource   = get_object_or_404(Resource, pk=pk)
        new_status = request.data.get('status', 'IN_PROGRESS')

        valid = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']
        if new_status not in valid:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        progress, _ = UserProgress.objects.get_or_create(user=request.user, resource=resource)
        progress.status = new_status
        if new_status == 'COMPLETED':
            progress.completed_at = timezone.now()
        progress.save()

        serializer = UserProgressSerializer(progress, context={'request': request})
        return Response(serializer.data)


class CVSkillGapView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        action = request.query_params.get('action', '')
        if action == 'recommendations':
            skill_gaps = CVSkillGap.objects.filter(user=request.user)
            skill_names = [sg.skill_name.lower() for sg in skill_gaps]
            if not skill_names:
                return Response({'message': 'No skill gaps found. Analyze your CV first.'})
            q = Q()
            for skill in skill_names:
                q |= Q(tags__icontains=skill) | Q(title__icontains=skill)
            resources  = Resource.objects.filter(q, is_free=True)[:20]
            serializer = ResourceSerializer(resources, many=True, context={'request': request})
            return Response({'skill_gaps': skill_names, 'recommendations': serializer.data})

        gaps       = CVSkillGap.objects.filter(user=request.user)
        serializer = CVSkillGapSerializer(gaps, many=True)
        return Response(serializer.data)

    def post(self, request):
        skills = request.data.get('skills', [])
        if not skills:
            return Response({'error': 'No skills provided'}, status=status.HTTP_400_BAD_REQUEST)
        CVSkillGap.objects.filter(user=request.user).delete()
        for skill in skills:
            CVSkillGap.objects.create(user=request.user, skill_name=skill)
        return Response({'message': f'{len(skills)} skill gaps saved!'})


class CategoryStatsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        categories = Resource.CATEGORY_CHOICES
        data = []
        for code, label in categories:
            count = Resource.objects.filter(category=code, is_free=True).count()
            data.append({'code': code, 'label': label, 'count': count})
        return Response(data)


class YouTubeSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '')
        if not query:
            return Response({'error': 'Query required'}, status=status.HTTP_400_BAD_REQUEST)
        results = search_youtube_videos(query)
        return Response({'query': query, 'results': results})


# Template views
def index_view(request):
    return render(request, 'resource_hub/index.html')

def category_view(request, category):
    return render(request, 'resource_hub/category.html', {'category': category})

def bookmarks_view(request):
    return render(request, 'resource_hub/bookmarks.html')

def skill_gaps_view(request):
    return render(request, 'resource_hub/skill_gaps.html')