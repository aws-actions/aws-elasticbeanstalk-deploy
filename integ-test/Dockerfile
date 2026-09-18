# Minimal container for the Beanstalk Cluster integration tests. Serves the same WSGI app the
# Beanstalk Standard test deploys (application.py), on the port the environment injects via
# PORT (Beanstalk Cluster's default service port is 5000).
FROM public.ecr.aws/docker/library/python:3.12-slim
WORKDIR /app
COPY application.py .
EXPOSE 5000
CMD ["python", "-c", "import os; from wsgiref.simple_server import make_server; from application import application; make_server('', int(os.environ.get('PORT', '5000')), application).serve_forever()"]
