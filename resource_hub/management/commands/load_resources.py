from django.core.management.base import BaseCommand
from resource_hub.models import Resource
from resource_hub.services.resource_db import get_curated_resources


class Command(BaseCommand):
    help = 'Load curated free resources into the database'

    def handle(self, *args, **kwargs):
        resources = get_curated_resources()
        created   = 0
        skipped   = 0

        for data in resources:
            obj, was_created = Resource.objects.get_or_create(
                url=data['url'],
                defaults={
                    'title':            data.get('title', ''),
                    'description':      data.get('description', ''),
                    'platform':         data.get('platform', 'Other'),
                    'category':         data.get('category', 'PROGRAMMING'),
                    'level':            data.get('level', 'ALL'),
                    'resource_type':    data.get('resource_type', 'COURSE'),
                    'is_free':          True,
                    'thumbnail_url':    data.get('thumbnail_url', ''),
                    'youtube_video_id': data.get('youtube_video_id', ''),
                    'duration':         data.get('duration', ''),
                    'tags':             data.get('tags', ''),
                }
            )
            if was_created:
                created += 1
                self.stdout.write(f'  ✓ {obj.title}')
            else:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'\nDone! {created} resources added, {skipped} already existed.'
            )
        )